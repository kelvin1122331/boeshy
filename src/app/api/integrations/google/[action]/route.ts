import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { requireUser, assertOrigin } from "@/lib/auth/guard";
import { db } from "@/lib/database";
import { AppError, errorResponse } from "@/lib/errors";
import { oauthApplication } from "@/server/admin/oauth";
import { encryptSecret, decryptSecret } from "@/server/admin/secrets";
type Context = { params: Promise<{ action: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { action } = await context.params;
    const app = await oauthApplication("google");
    if (action === "connect") {
      const state = "google_" + randomBytes(32).toString("hex"),
        verifier = randomBytes(48).toString("base64url");
      await db.oAuthState.create({
        data: {
          id: state,
          userId: user.id,
          verifier,
          expiresAt: new Date(Date.now() + 600000),
        },
      });
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({
        client_id: app.clientId,
        redirect_uri: app.redirectUri,
        response_type: "code",
        scope: app.scopes.join(" "),
        state,
        code_challenge: createHash("sha256")
          .update(verifier)
          .digest("base64url"),
        code_challenge_method: "S256",
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "false",
      }).toString();
      return Response.redirect(url);
    }
    if (action === "callback") {
      const url = new URL(request.url),
        state = url.searchParams.get("state") || "";
      if (!state.startsWith("google_"))
        throw new AppError(400, "State OAuth tidak valid.");
      const stored = await db.oAuthState.findFirst({
        where: { id: state, userId: user.id, expiresAt: { gt: new Date() } },
      });
      const code = url.searchParams.get("code");
      if (!stored || !code)
        throw new AppError(400, "Otorisasi ditolak atau kedaluwarsa.");
      if (
        (
          await db.oAuthState.deleteMany({
            where: { id: state, userId: user.id },
          })
        ).count !== 1
      )
        throw new AppError(400, "State OAuth sudah digunakan.");
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: app.clientId,
          client_secret: app.clientSecret,
          redirect_uri: app.redirectUri,
          code,
          code_verifier: stored.verifier,
          grant_type: "authorization_code",
        }),
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok)
        throw new AppError(502, "Google menolak pertukaran token OAuth.");
      const token = z
        .object({
          access_token: z.string(),
          refresh_token: z.string().optional(),
          expires_in: z.number(),
          scope: z.string().optional(),
        })
        .parse(await response.json());
      const previous = await db.integrationAccount.findUnique({
        where: { userId_provider: { userId: user.id, provider: "google" } },
      });
      const previousToken = previous
        ? decryptSecret<{ refresh_token?: string }>(
            previous.encryptedTokens,
            `integration:google:${user.id}`,
          )
        : null;
      const encryptedTokens = encryptSecret(
        {
          ...token,
          refresh_token: token.refresh_token || previousToken?.refresh_token,
        },
        `integration:google:${user.id}`,
      );
      await db.integrationAccount.upsert({
        where: { userId_provider: { userId: user.id, provider: "google" } },
        create: {
          userId: user.id,
          provider: "google",
          encryptedTokens,
          expiresAt: new Date(Date.now() + token.expires_in * 1000),
        },
        update: {
          encryptedTokens,
          expiresAt: new Date(Date.now() + token.expires_in * 1000),
        },
      });
      await db.auditLog.create({
        data: { userId: user.id, action: "integration.google.connected" },
      });
      return Response.redirect(
        new URL("/settings/integrations?connected=google", process.env.APP_URL),
      );
    }
    if (action === "status") {
      const account = await db.integrationAccount.findUnique({
        where: { userId_provider: { userId: user.id, provider: "google" } },
        select: { expiresAt: true, createdAt: true },
      });
      return Response.json(
        { connected: !!account, expiresAt: account?.expiresAt || null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    throw new AppError(404, "Rute tidak ditemukan.");
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    assertOrigin(request);
    const user = await requireUser();
    if ((await context.params).action !== "disconnect")
      throw new AppError(404, "Rute tidak ditemukan.");
    await db.integrationAccount.deleteMany({
      where: { userId: user.id, provider: "google" },
    });
    await db.auditLog.create({
      data: { userId: user.id, action: "integration.google.disconnected" },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
