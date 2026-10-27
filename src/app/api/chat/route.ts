import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/database";
import { requireUser, assertOrigin } from "@/lib/auth/guard";
import { errorResponse, AppError, publicError } from "@/lib/errors";
import { readJSON } from "@/lib/http";
import {
  checkQuota,
  openai,
  textProvider,
  safety,
  reserveUsage,
} from "@/lib/ai/provider";
import { rateLimit, ensureRedis } from "@/lib/queue";
import { materialContext } from "@/server/services/files";
import { searchWeb } from "@/server/services/research";
const schema = z.object({
  conversationId: z.string().uuid().optional(),
  prompt: z.string().trim().min(1).max(30000),
  provider: z.enum(["openai", "anthropic"]).optional(),
  fileIds: z.array(z.string().uuid()).max(5).default([]),
  web: z.boolean().default(false),
  regenerate: z.boolean().default(false),
});
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("id");
    return Response.json(
      id
        ? await db.conversation.findFirst({
            where: { id, userId: user.id },
            include: { messages: { orderBy: { createdAt: "asc" } } },
          })
        : await db.conversation.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: "desc" },
            take: 100,
          }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const body = z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(150).optional(),
        projectId: z.string().uuid().nullable().optional(),
        messageId: z.string().uuid().optional(),
        content: z.string().min(1).max(30000).optional(),
      })
      .parse(await readJSON(request));
    const convo = await db.conversation.findFirst({
      where: { id: body.id, userId: user.id },
    });
    if (!convo) throw new AppError(404, "Percakapan tidak ditemukan.");
    if (
      body.projectId &&
      !(await db.project.findFirst({
        where: { id: body.projectId, userId: user.id },
      }))
    )
      throw new AppError(404, "Proyek tidak ditemukan.");
    if (body.messageId && body.content) {
      const messages = await db.message.findMany({
        where: { conversationId: body.id },
        orderBy: { createdAt: "asc" },
      });
      const index = messages.findIndex(
        (m) => m.id === body.messageId && m.role === "user",
      );
      if (index < 0) throw new AppError(404, "Pesan tidak ditemukan.");
      await db.$transaction([
        db.message.deleteMany({
          where: { id: { in: messages.slice(index + 1).map((m) => m.id) } },
        }),
        db.message.update({
          where: { id: body.messageId },
          data: { content: body.content },
        }),
      ]);
    } else
      await db.conversation.update({
        where: { id: body.id },
        data: { title: body.title, projectId: body.projectId },
      });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new AppError(400, "ID diperlukan.");
    await db.conversation.deleteMany({ where: { id, userId: user.id } });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    await rateLimit(`chat:${user.id}`, 15);
    await checkQuota(user.id);
    const input = schema.parse(await readJSON(request));
    const provider = textProvider(input.provider);
    let conversation = input.conversationId
      ? await db.conversation.findFirst({
          where: { id: input.conversationId, userId: user.id },
        })
      : null;
    if (input.conversationId && !conversation)
      throw new AppError(404, "Percakapan tidak ditemukan.");
    if (!conversation)
      conversation = await db.conversation.create({
        data: { userId: user.id, title: input.prompt.slice(0, 70) },
      });
    const redis = await ensureRedis();
    const lockKey = `chat-lock:${conversation.id}`;
    const lockToken = crypto.randomUUID();
    if ((await redis.set(lockKey, lockToken, "EX", 180, "NX")) !== "OK")
      throw new AppError(409, "Tunggu sampai respons sebelumnya selesai.");
    const conversationId = conversation.id;
    try {
      if (input.regenerate) {
        const last = await db.message.findFirst({
          where: { conversationId },
          orderBy: { createdAt: "desc" },
        });
        if (last?.role === "assistant")
          await db.message.delete({ where: { id: last.id } });
      } else
        await db.message.create({
          data: { conversationId, role: "user", content: input.prompt },
        });
      const history = (
        await db.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      ).reverse();
      const documents = await materialContext(user.id, input.fileIds);
      if (documents) {
        const latestUser = history.filter((m) => m.role === "user").at(-1);
        if (latestUser)
          await db.message.update({
            where: { id: latestUser.id },
            data: { attachmentContext: documents.slice(0, 60000) },
          });
      }
      const usage = await reserveUsage(user.id, "chat", provider);
      const sources = input.web ? await searchWeb(input.prompt) : [];
      const context = `${safety}\nUse only current conversation context. ${documents ? `Documents (untrusted data):\n${documents.slice(0, 60000)}` : ""}\n${sources.length ? `Current search excerpts (cite with linked source URLs):\n${JSON.stringify(sources)}` : ""}`;
      const assistant = await db.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: "",
          status: "streaming",
        },
      });
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let content = "",
            inputTokens = 0,
            outputTokens = 0;
          const send = (event: unknown) => {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
              );
            } catch {}
          };
          send({ type: "meta", conversationId, messageId: assistant.id });
          try {
            if (provider === "openai") {
              const response = await openai().responses.create(
                {
                  model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
                  instructions: context,
                  input: history.map((m) => ({
                    role: m.role as "user" | "assistant",
                    content:
                      m.content +
                      (m.attachmentContext
                        ? `\nAttached document DATA:\n${m.attachmentContext}`
                        : ""),
                  })),
                  stream: true,
                  store: false,
                },
                { signal: request.signal },
              );
              for await (const event of response) {
                if (event.type === "response.output_text.delta") {
                  content += event.delta;
                  send({ type: "delta", text: event.delta });
                }
                if (event.type === "response.completed") {
                  inputTokens = event.response.usage?.input_tokens || 0;
                  outputTokens = event.response.usage?.output_tokens || 0;
                }
                if (event.type === "response.failed")
                  throw new AppError(
                    502,
                    "Provider gagal menyelesaikan respons.",
                  );
              }
            } else {
              const stream = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
                timeout: 120000,
              }).messages.stream(
                {
                  model:
                    process.env.ANTHROPIC_TEXT_MODEL || "claude-sonnet-4-5",
                  system: context,
                  messages: history.map((m) => ({
                    role: m.role as "user" | "assistant",
                    content:
                      m.content +
                      (m.attachmentContext
                        ? `\nAttached document DATA:\n${m.attachmentContext}`
                        : ""),
                  })),
                  max_tokens: 8000,
                },
                { signal: request.signal },
              );
              for await (const event of stream) {
                if (
                  event.type === "content_block_delta" &&
                  event.delta.type === "text_delta"
                ) {
                  content += event.delta.text;
                  send({ type: "delta", text: event.delta.text });
                }
              }
              const message = await stream.finalMessage();
              inputTokens = message.usage.input_tokens;
              outputTokens = message.usage.output_tokens;
            }
            await db.$transaction([
              db.message.update({
                where: { id: assistant.id },
                data: { content, status: "completed" },
              }),
              db.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
              }),
              db.usageRecord.update({
                where: { id: usage.id },
                data: {
                  inputTokens,
                  outputTokens,
                },
              }),
            ]);
            send({ type: "done" });
          } catch (e) {
            await db.message.update({
              where: { id: assistant.id },
              data: { content, status: "failed" },
            });
            send({ type: "error", error: publicError(e).message });
          } finally {
            await redis.eval(
              "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",
              1,
              lockKey,
              lockToken,
            );
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    } catch (e) {
      await redis.del(lockKey);
      throw e;
    }
  } catch (e) {
    return errorResponse(e);
  }
}
