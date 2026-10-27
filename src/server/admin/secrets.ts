import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { AppError } from "@/lib/errors";
function masterKey() {
  const value = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!value || !/^[a-f\d]{64}$/i.test(value))
    throw new AppError(
      503,
      "Penyimpanan kredensial belum siap. Administrator deployment perlu mengatur kunci enkripsi server.",
    );
  return Buffer.from(value, "hex");
}
export function encryptionReady() {
  return /^[a-f\d]{64}$/i.test(process.env.CREDENTIAL_ENCRYPTION_KEY || "");
}
export function encryptSecret(value: unknown, context: string) {
  const iv = randomBytes(12),
    key = masterKey(),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`holyai:${context}:1`));
  const bytes = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return JSON.stringify({
    v: 1,
    kid: createHash("sha256").update(key).digest("hex").slice(0, 12),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: bytes.toString("base64"),
  });
}
export function decryptSecret<T = Record<string, string>>(
  raw: string,
  context: string,
): T {
  try {
    const value = JSON.parse(raw);
    if (value.v !== 1) throw new Error();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      masterKey(),
      Buffer.from(value.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(`holyai:${context}:1`));
    decipher.setAuthTag(Buffer.from(value.tag, "base64"));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(value.data, "base64")),
        decipher.final(),
      ]).toString(),
    );
  } catch {
    throw new AppError(
      503,
      "Kredensial tersimpan tidak dapat dibuka oleh kunci server ini. Periksa konfigurasi enkripsi deployment.",
    );
  }
}
export function maskSecrets(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value.length > 4 ? `••••••••${value.slice(-4)}` : "••••••••",
    ]),
  );
}
