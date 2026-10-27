import { hasPermission } from "@/lib/permissions";
import {
  assertFeatureEnabled,
  assertFeatureReady,
} from "@/server/admin/router";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/database";
import { requireUser, assertOrigin } from "@/lib/auth/guard";
import { AppError, errorResponse } from "@/lib/errors";
import { readJSON } from "@/lib/http";
import { capabilities } from "@/lib/ai/capabilities";
import {
  inputSchema,
  documentSchema,
  slidesSchema,
  matrixSchema,
  rubricSchema,
  defenseSchema,
} from "@/lib/validation/schemas";
import { findFeature } from "@/config/features";
import { checkQuota } from "@/lib/ai/provider";
import { ensureRedis, jobsQueue, rateLimit } from "@/lib/queue";
import { exportDocument, exportFormat } from "./export";
import { examAction } from "./exams";
import { removeFile, signedDownload } from "@/lib/storage";
import { academicSearch } from "./academic";
import { generateJSON } from "@/lib/ai/provider";
const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(""),
  subject: z.string().max(100).default(""),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["todo", "doing", "done"]).default("todo"),
  dueAt: z.string().datetime().nullable().optional(),
});
async function ownedProject(userId: string, projectId?: string | null) {
  if (
    projectId &&
    !(await db.project.findFirst({ where: { id: projectId, userId } }))
  )
    throw new AppError(404, "Proyek tidak ditemukan.");
}
export async function workspaceAPI(request: Request, path: string[]) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const userId = user.id;
    const method = request.method;
    const url = new URL(request.url);
    const [resource, id, action] = path;
    if (resource === "tasks" && method !== "GET")
      await assertFeatureEnabled("task-manager");
    if (resource === "academic")
      await assertFeatureEnabled("academic-research");
    if (["POST", "PATCH", "DELETE"].includes(method))
      await db.auditLog.create({
        data: {
          userId,
          action: `${method.toLowerCase()}.${resource}`,
          resourceId: id?.slice(0, 100),
        },
      });
    const body =
      method === "POST" || method === "PATCH" ? await readJSON(request) : {};
    if (resource === "capabilities")
      return Response.json({
        ...(await capabilities()),
        canConfigureProviders: hasPermission(
          (
            await db.user.findUnique({
              where: { id: userId },
              select: { role: true },
            })
          )?.role || "user",
          "providers.write",
        ),
        canvaConnected: !!(await db.integrationAccount.findUnique({
          where: { userId_provider: { userId, provider: "canva" } },
          select: { id: true },
        })),
      });
    if (resource === "dashboard") {
      const [items, tasks, usage, files] = await Promise.all([
        db.workspaceItem.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 6,
        }),
        db.task.count({ where: { userId, status: { not: "done" } } }),
        db.usageRecord.aggregate({
          where: { userId },
          _count: true,
          _sum: { inputTokens: true, outputTokens: true },
        }),
        db.projectFile.count({ where: { userId } }),
      ]);
      return Response.json({ items, tasks, usage, files });
    }
    if (resource === "projects") {
      if (method === "GET") {
        if (id) {
          const project = await db.project.findFirst({
            where: { id, userId },
            include: {
              items: { orderBy: { updatedAt: "desc" } },
              files: true,
              conversations: true,
            },
          });
          if (!project) throw new AppError(404, "Proyek tidak ditemukan.");
          return Response.json(project);
        }
        return Response.json(
          await db.project.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            take: 100,
          }),
        );
      }
      if (method === "POST") {
        const input = z
          .object({
            title: z.string().trim().min(1).max(100),
            description: z.string().max(2000).default(""),
          })
          .parse(body);
        return Response.json(
          await db.project.create({ data: { ...input, userId } }),
        );
      }
      if (method === "DELETE" && id) {
        await db.project.deleteMany({ where: { id, userId } });
        return Response.json({ ok: true });
      }
    }
    if (resource === "items" || resource === "history") {
      if (method === "GET") {
        if (id) {
          const item = await db.workspaceItem.findFirst({
            where: { id, userId },
            include: { versions: { orderBy: { createdAt: "desc" }, take: 20 } },
          });
          if (!item) throw new AppError(404, "Hasil tidak ditemukan.");
          return Response.json(item);
        }
        return Response.json(
          await db.workspaceItem.findMany({
            where: {
              userId,
              ...(url.searchParams.get("kind")
                ? { kind: url.searchParams.get("kind")! }
                : {}),
              ...(url.searchParams.get("q")
                ? {
                    title: {
                      contains: url.searchParams.get("q")!,
                      mode: "insensitive",
                    },
                  }
                : {}),
            },
            orderBy: { updatedAt: "desc" },
            take: 100,
          }),
        );
      }
      const item = await db.workspaceItem.findFirst({ where: { id, userId } });
      if (!item) throw new AppError(404, "Hasil tidak ditemukan.");
      if (method === "DELETE") {
        await db.workspaceItem.delete({ where: { id } });
        return Response.json({ ok: true });
      }
      if (method === "PATCH") {
        const input = z
          .object({
            title: z.string().trim().min(1).max(200),
            data: z.record(z.string(), z.unknown()),
            projectId: z.string().uuid().nullable().optional(),
          })
          .parse(body);
        await ownedProject(userId, input.projectId);
        const schema =
          item.kind === "presentation-studio"
            ? slidesSchema
            : item.kind === "journal-matrix"
              ? matrixSchema
              : item.kind === "rubric-checker"
                ? rubricSchema
                : item.kind === "defense-simulator"
                  ? defenseSchema
                  : documentSchema;
        const parsed = schema.parse(input.data);
        const data = { ...input.data, ...parsed } as Prisma.InputJsonObject;
        return Response.json(
          await db.$transaction(async (tx) => {
            await tx.documentVersion.create({
              data: {
                itemId: item.id,
                data: item.data as Prisma.InputJsonValue,
              },
            });
            return tx.workspaceItem.update({
              where: { id: item.id },
              data: { title: input.title, data, projectId: input.projectId },
            });
          }),
        );
      }
    }
    if (resource === "jobs") {
      if (method === "GET") {
        const result = await db.generationJob.findMany({
          where: {
            userId,
            ...(id ? { id } : {}),
            ...(url.searchParams.get("kind")
              ? { kind: url.searchParams.get("kind")! }
              : {}),
          },
          include: { assets: { select: { id: true, mime: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
        return Response.json(id ? (result[0] ?? null) : result);
      }
      if (method === "POST") {
        await rateLimit(`generation:${userId}`, 10);
        const feature = findFeature(id);
        if (
          !feature ||
          ["chat", "academic-research", "task-manager"].includes(id)
        )
          throw new AppError(400, "Gunakan alur khusus fitur ini.");
        const input = inputSchema.parse(body);
        await ownedProject(userId, input.projectId);
        await assertFeatureReady(id);
        await checkQuota(userId);
        await ensureRedis();
        if (
          input.fileIds.length !==
          (await db.projectFile.count({
            where: { userId, id: { in: input.fileIds } },
          }))
        )
          throw new AppError(404, "File tidak ditemukan.");
        const job = await db.generationJob.create({
          data: { userId, kind: id, input: input as Prisma.InputJsonObject },
        });
        try {
          await jobsQueue().add(
            "generate",
            { id: job.id },
            { jobId: job.id, removeOnComplete: 100, removeOnFail: 100 },
          );
        } catch {
          await db.generationJob.update({
            where: { id: job.id },
            data: {
              status: "failed",
              error: "Antrean tidak tersedia. Jalankan Redis dan worker.",
            },
          });
          throw new AppError(
            503,
            "Antrean belum tersedia. Jalankan Redis dan worker.",
          );
        }
        return Response.json(job, { status: 202 });
      }
      if (method === "DELETE") {
        const job = await db.generationJob.findFirst({ where: { id, userId } });
        if (!job) throw new AppError(404, "Pekerjaan tidak ditemukan.");
        if (job.status !== "queued")
          throw new AppError(
            409,
            "Hanya pekerjaan yang belum diproses dapat dibatalkan. Provider tidak mendukung pembatalan saat proses berjalan.",
          );
        const queued = await jobsQueue().getJob(id);
        if (queued) await queued.remove();
        await db.generationJob.update({
          where: { id },
          data: { status: "cancelled", stage: "cancelled" },
        });
        return Response.json({ ok: true });
      }
    }
    if (resource === "assets" && id) {
      const asset = await db.generatedAsset.findFirst({
        where: { id, job: { userId } },
      });
      if (!asset) throw new AppError(404, "Aset tidak ditemukan.");
      return Response.json({ url: await signedDownload(asset.key) });
    }
    if (resource === "academic") {
      const input = z
        .object({
          query: z.string().trim().min(2).max(500),
          from: z.number().int().min(1800).max(2100).optional(),
          to: z.number().int().min(1800).max(2100).optional(),
          openAccess: z.boolean().default(false),
        })
        .parse(body);
      await rateLimit(`academic:${userId}`, 20);
      const references = await academicSearch(
        input.query,
        input.from,
        input.to,
        input.openAccess,
      );
      const item = await db.workspaceItem.create({
        data: {
          userId,
          kind: "academic-research",
          title: input.query,
          data: { references: references as unknown as Prisma.InputJsonArray },
        },
      });
      return Response.json({ references, itemId: item.id });
    }
    if (resource === "tasks") {
      if (method === "POST" && id === "extract") {
        await rateLimit(`extract:${userId}`, 10);
        const input = z
          .object({ text: z.string().min(5).max(30000) })
          .parse(body);
        return Response.json(
          await generateJSON(
            userId,
            "task-manager",
            `Extract likely tasks, subject, instructions, priority, and deadlines. Current UTC date ${new Date().toISOString()}, user timezone ${user.timezone}. Ambiguous dates MUST be null, mark questions. Do not save tasks; user must confirm every task.`,
            input.text,
            z.object({
              tasks: z
                .array(
                  z.object({
                    title: z.string(),
                    description: z.string(),
                    subject: z.string(),
                    priority: z.enum(["low", "medium", "high"]),
                    dueAt: z.string().nullable(),
                    clarification: z.string(),
                  }),
                )
                .max(20),
            }),
          ),
        );
      }
      if (method === "GET")
        return Response.json(
          await db.task.findMany({
            where: { userId },
            orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
            take: 500,
          }),
        );
      if (method === "POST")
        return Response.json(
          await db.task.create({ data: { ...taskSchema.parse(body), userId } }),
        );
      if (method === "PATCH") {
        const input = taskSchema.partial().parse(body);
        const task = await db.task.updateMany({
          where: { id, userId },
          data: { ...input, ...("dueAt" in input ? { remindedAt: null } : {}) },
        });
        if (!task.count) throw new AppError(404, "Tugas tidak ditemukan.");
        return Response.json({ ok: true });
      }
      if (method === "DELETE") {
        await db.task.deleteMany({ where: { id, userId } });
        return Response.json({ ok: true });
      }
    }
    if (resource === "exams")
      return Response.json(
        await examAction(userId, path.slice(1), method, body),
      );
    if (resource === "notifications") {
      if (method === "PATCH") {
        await db.notification.updateMany({
          where: { userId, ...(id ? { id } : {}) },
          data: { read: true },
        });
        return Response.json({ ok: true });
      }
      return Response.json(
        await db.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      );
    }
    if (resource === "files") {
      const file = id
        ? await db.projectFile.findFirst({ where: { id, userId } })
        : null;
      if (id && !file) throw new AppError(404, "File tidak ditemukan.");
      if (method === "DELETE" && file) {
        await removeFile(file.key);
        await db.projectFile.delete({ where: { id } });
        return Response.json({ ok: true });
      }
      if (file)
        return Response.json({
          url: await signedDownload(file.key, file.name),
        });
      return Response.json(
        await db.projectFile.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            mime: true,
            size: true,
            warning: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      );
    }
    if (resource === "export" && id) {
      const format = exportFormat.parse(url.searchParams.get("format"));
      const item = await db.workspaceItem.findFirst({ where: { id, userId } });
      if (!item) throw new AppError(404, "Dokumen tidak ditemukan.");
      const file = await exportDocument(
        format,
        item.data as Record<string, unknown>,
      );
      return new Response(new Uint8Array(file.buffer), {
        headers: {
          "Content-Type": file.mime,
          "Content-Disposition": `attachment; filename="holyai-${item.id}.${file.extension}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (resource === "search") {
      const query = url.searchParams.get("q")?.slice(0, 100) || "";
      const [items, projects, conversations, tasks] = await Promise.all([
        db.workspaceItem.findMany({
          where: { userId, title: { contains: query, mode: "insensitive" } },
          select: { id: true, title: true, kind: true },
          take: 10,
        }),
        db.project.findMany({
          where: { userId, title: { contains: query, mode: "insensitive" } },
          take: 5,
        }),
        db.conversation.findMany({
          where: { userId, title: { contains: query, mode: "insensitive" } },
          take: 5,
        }),
        db.task.findMany({
          where: { userId, title: { contains: query, mode: "insensitive" } },
          take: 5,
        }),
      ]);
      return Response.json({ items, projects, conversations, tasks });
    }
    if (resource === "privacy" && action === "export") {
      const [projects, files, items, conversations, tasks, exams, usage] =
        await Promise.all([
          db.project.findMany({ where: { userId } }),
          db.projectFile.findMany({
            where: { userId },
            select: {
              id: true,
              name: true,
              mime: true,
              size: true,
              text: true,
              createdAt: true,
            },
          }),
          db.workspaceItem.findMany({ where: { userId } }),
          db.conversation.findMany({
            where: { userId },
            include: { messages: true },
          }),
          db.task.findMany({ where: { userId } }),
          db.exam.findMany({
            where: { userId },
            include: {
              questions: true,
              attempts: { include: { answers: true } },
            },
          }),
          db.usageRecord.findMany({ where: { userId } }),
        ]);
      return Response.json(
        {
          user,
          projects,
          files,
          items,
          conversations,
          tasks,
          exams: exams.map((exam) => ({
            ...exam,
            questions: exam.questions.map((q) =>
              exam.attempts.some((a) => a.submittedAt)
                ? q
                : {
                    id: q.id,
                    examId: q.examId,
                    position: q.position,
                    topic: q.topic,
                    prompt: q.prompt,
                    options: q.options,
                  },
            ),
          })),
          usage,
        },
        {
          headers: {
            "Content-Disposition": 'attachment; filename="holyai-data.json"',
            "Cache-Control": "no-store",
          },
        },
      );
    }
    if (resource === "admin") {
      const { adminIdentity } = await import("@/server/admin/access");
      const { overview } = await import("@/server/admin/monitoring");
      await adminIdentity("monitoring.read");
      return Response.json(await overview(), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    throw new AppError(404, "Rute tidak ditemukan.");
  } catch (error) {
    return errorResponse(error);
  }
}
