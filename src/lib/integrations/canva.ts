import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { db } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { z } from "zod";
const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});
function key() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw || !/^[a-f\d]{64}$/i.test(raw))
    throw new AppError(
      503,
      "Requires Configuration: atur TOKEN_ENCRYPTION_KEY 32 byte.",
    );
  return Buffer.from(raw, "hex");
}
export function encryptTokens(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
export function decryptTokens(raw: string) {
  const bytes = Buffer.from(raw, "base64"),
    decipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return tokenSchema.parse(
    JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]).toString(),
    ),
  );
}
export async function exchangeToken(params: Record<string, string>) {
  const auth = Buffer.from(
    `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`,
  ).toString("base64");
  const r = await fetch("https://api.canva.com/rest/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new AppError(
      502,
      "Canva menolak otorisasi. Periksa konfigurasi, scope, dan izin akun.",
    );
  return tokenSchema.parse(await r.json());
}
export async function saveCanvaTokens(
  userId: string,
  tokens: z.infer<typeof tokenSchema>,
) {
  const data = {
    encryptedTokens: encryptTokens(tokens),
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  };
  await db.integrationAccount.upsert({
    where: { userId_provider: { userId, provider: "canva" } },
    create: { userId, provider: "canva", ...data },
    update: data,
  });
}
export async function canvaRequest(
  userId: string,
  path: string,
  body?: unknown,
) {
  const account = await db.integrationAccount.findUnique({
    where: { userId_provider: { userId, provider: "canva" } },
  });
  if (!account)
    throw new AppError(409, "Hubungkan akun Canva di Pengaturan → Integrasi.");
  let tokens = decryptTokens(account.encryptedTokens);
  if (!account.expiresAt || account.expiresAt.getTime() < Date.now() + 60000) {
    tokens = await exchangeToken({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    });
    await saveCanvaTokens(userId, tokens);
  }
  const response = await fetch(`https://api.canva.com/rest/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok)
    throw new AppError(
      response.status === 403 ? 403 : 502,
      response.status === 403
        ? "Akun Canva belum memiliki izin atau paket yang diperlukan. Gunakan ekspor PPTX internal."
        : "Permintaan Canva gagal. Coba kembali atau ekspor PPTX internal.",
    );
  return response.json();
}
