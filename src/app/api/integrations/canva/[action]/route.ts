import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { requireUser, assertOrigin } from "@/lib/auth/guard";
import { db } from "@/lib/database";
import { AppError, errorResponse } from "@/lib/errors";
import { capabilities } from "@/lib/ai/capabilities";
import {
  exchangeToken,
  saveCanvaTokens,
  canvaRequest,
} from "@/lib/integrations/canva";
import { exportDocument } from "@/server/services/export";
import { putFile, signedDownload } from "@/lib/storage";
import { readJSON } from "@/lib/http";
type Context = { params: Promise<{ action: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser();
    if (!capabilities().canva)
      throw new AppError(
        503,
        "Requires Configuration: atur kredensial OAuth Canva dan kunci enkripsi token.",
      );
    const { action } = await context.params;
    const url = new URL(request.url);
    if (action === "connect") {
      const state = randomBytes(32).toString("hex"),
        verifier = randomBytes(48).toString("base64url");
      await db.oAuthState.create({
        data: {
          id: state,
          userId: user.id,
          verifier,
          expiresAt: new Date(Date.now() + 600000),
        },
      });
      const target = new URL("https://www.canva.com/api/oauth/authorize");
      target.search = new URLSearchParams({
        client_id: process.env.CANVA_CLIENT_ID!,
        redirect_uri: process.env.CANVA_REDIRECT_URI!,
        response_type: "code",
        scope:
          "design:content:read design:content:write design:meta:read asset:read asset:write",
        state,
        code_challenge: createHash("sha256")
          .update(verifier)
          .digest("base64url"),
        code_challenge_method: "s256",
      }).toString();
      return Response.redirect(target);
    }
    if (action === "callback") {
      const state = url.searchParams.get("state") || "";
      const stored = await db.oAuthState.findFirst({
        where: { id: state, userId: user.id, expiresAt: { gt: new Date() } },
      });
      if (!stored || !url.searchParams.get("code"))
        throw new AppError(
          400,
          "Otorisasi Canva kedaluwarsa atau ditolak. Hubungkan ulang.",
        );
      const consumed = await db.oAuthState.deleteMany({
        where: { id: state, userId: user.id },
      });
      if (consumed.count !== 1)
        throw new AppError(400, "Otorisasi sudah digunakan.");
      const tokens = await exchangeToken({
        grant_type: "authorization_code",
        code: url.searchParams.get("code")!,
        code_verifier: stored.verifier,
        redirect_uri: process.env.CANVA_REDIRECT_URI!,
      });
      await saveCanvaTokens(user.id, tokens);
      return Response.redirect(
        new URL("/settings/integrations?connected=canva", process.env.APP_URL),
      );
    }
    if (action === "status") {
      const id = z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/)
        .parse(url.searchParams.get("id"));
      const type =
        url.searchParams.get("type") === "export" ? "exports" : "url-imports";
      const job = await db.generationJob.findFirst({
        where: { userId: user.id, providerId: id, kind: `canva-${type}` },
      });
      if (!job) throw new AppError(404, "Pekerjaan Canva tidak ditemukan.");
      const result = await canvaRequest(user.id, `${type}/${id}`);
      await db.generationJob.update({
        where: { id: job.id },
        data: {
          stage: result.job?.status || "processing",
          status:
            result.job?.status === "success"
              ? "completed"
              : result.job?.status === "failed"
                ? "failed"
                : "processing",
          result,
        },
      });
      return Response.json(result);
    }
    throw new AppError(404, "Rute tidak ditemukan.");
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    const { action } = await context.params;
    if (action === "disconnect") {
      await db.integrationAccount.deleteMany({
        where: { userId: user.id, provider: "canva" },
      });
      return Response.json({ ok: true });
    }
    const input = z
      .object({
        itemId: z.string().uuid(),
        designId: z
          .string()
          .regex(/^[a-zA-Z0-9_-]+$/)
          .optional(),
        format: z.enum(["pdf", "pptx"]).default("pptx"),
      })
      .parse(await readJSON(request));
    const item = await db.workspaceItem.findFirst({
      where: { id: input.itemId, userId: user.id, kind: "presentation-studio" },
    });
    if (!item) throw new AppError(404, "Presentasi tidak ditemukan.");
    let result;
    if (action === "import") {
      const file = await exportDocument(
        "pptx",
        item.data as Record<string, unknown>,
      );
      const key = `${user.id}/canva/${item.id}.pptx`;
      await putFile(key, file.buffer, file.mime);
      result = await canvaRequest(user.id, "url-imports", {
        url: await signedDownload(key, undefined, 900),
        title: item.title,
      });
      await db.generationJob.create({
        data: {
          userId: user.id,
          itemId: item.id,
          kind: "canva-url-imports",
          providerId: result.job?.id,
          status: "processing",
          input: { key },
          result,
        },
      });
    } else if (action === "export" && input.designId) {
      const imported = await db.generationJob.findFirst({
        where: {
          userId: user.id,
          itemId: item.id,
          kind: "canva-url-imports",
          status: "completed",
        },
      });
      const importedResult = imported?.result as {
        job?: { result?: { designs?: { id: string }[] } };
      } | null;
      if (
        !importedResult?.job?.result?.designs?.some(
          (d) => d.id === input.designId,
        )
      )
        throw new AppError(
          403,
          "Desain harus berasal dari presentasi milikmu.",
        );
      result = await canvaRequest(user.id, "exports", {
        design_id: input.designId,
        format: { type: input.format },
      });
      await db.generationJob.create({
        data: {
          userId: user.id,
          itemId: item.id,
          kind: "canva-exports",
          providerId: result.job?.id,
          status: "processing",
          input: { designId: input.designId },
          result,
        },
      });
    } else throw new AppError(400, "Aksi Canva tidak valid.");
    if (!result.job?.id)
      throw new AppError(
        502,
        "Canva belum mengembalikan ID pekerjaan yang valid.",
      );
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
