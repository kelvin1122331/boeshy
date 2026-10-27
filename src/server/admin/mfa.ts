import {
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { db } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { encryptSecret, decryptSecret } from "./secrets";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(bytes: Buffer) {
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let text = "";
  for (let n = 0; n < bits.length; n += 5)
    text += alphabet[parseInt(bits.slice(n, n + 5).padEnd(5, "0"), 2)];
  return text;
}
function decode(value: string) {
  let bits = "";
  for (const char of value)
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  return Buffer.from(
    Array.from({ length: Math.floor(bits.length / 8) }, (_, i) =>
      parseInt(bits.slice(i * 8, i * 8 + 8), 2),
    ),
  );
}
export function totp(secret: string, counter: number) {
  const data = Buffer.alloc(8);
  data.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decode(secret)).update(data).digest(),
    offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function setupMfa(userId: string, email: string) {
  const current = await db.adminMfa.findUnique({ where: { userId } });
  if (current?.enabled) throw new AppError(409, "MFA sudah aktif.");
  const secret = base32(randomBytes(20));
  await db.adminMfa.upsert({
    where: { userId },
    create: {
      userId,
      encryptedSecret: encryptSecret({ secret }, `mfa:${userId}`),
      backupHashes: [],
    },
    update: {
      encryptedSecret: encryptSecret({ secret }, `mfa:${userId}`),
      enabled: false,
      lastCounter: BigInt(-1),
      backupHashes: [],
    },
  });
  return {
    secret,
    uri: `otpauth://totp/${encodeURIComponent(`HOLYAI:${email}`)}?secret=${secret}&issuer=HOLYAI&algorithm=SHA1&digits=6&period=30`,
  };
}
export async function verifyMfa(
  userId: string,
  sessionId: string,
  code: string,
) {
  const current = await db.adminMfa.findUnique({ where: { userId } });
  if (!current) throw new AppError(400, "Siapkan MFA terlebih dahulu.");
  const { secret } = decryptSecret<{ secret: string }>(
    current.encryptedSecret,
    `mfa:${userId}`,
  );
  const now = Math.floor(Date.now() / 30000);
  let counter: number | null = null;
  for (const n of [now - 1, now, now + 1]) {
    const expected = totp(secret, n);
    if (
      /^\d{6}$/.test(code) &&
      timingSafeEqual(Buffer.from(code), Buffer.from(expected)) &&
      BigInt(n) > current.lastCounter
    )
      counter = n;
  }
  const backup = hash(code);
  const useBackup = current.enabled && current.backupHashes.includes(backup);
  if (counter === null && !useBackup)
    throw new AppError(
      400,
      "Kode MFA tidak valid, kedaluwarsa, atau sudah digunakan.",
    );
  const recoveryCodes = current.enabled
    ? []
    : Array.from({ length: 8 }, () => randomBytes(6).toString("hex"));
  await db.$transaction(async (tx) => {
    const changed = await tx.adminMfa.updateMany({
      where: {
        userId,
        lastCounter: current.lastCounter,
        updatedAt: current.updatedAt,
      },
      data: {
        enabled: true,
        lastCounter: counter === null ? current.lastCounter : BigInt(counter),
        backupHashes: recoveryCodes.length
          ? recoveryCodes.map(hash)
          : current.backupHashes.filter(
              (value) => !useBackup || value !== backup,
            ),
      },
    });
    if (!changed.count)
      throw new AppError(409, "Kode sedang diproses. Coba kembali.");
    await tx.adminMfaGrant.upsert({
      where: { sessionId },
      create: { sessionId, userId, expiresAt: new Date(Date.now() + 600000) },
      update: { userId, expiresAt: new Date(Date.now() + 600000) },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: current.enabled ? "admin.mfa.verified" : "admin.mfa.enabled",
      },
    });
  });
  return { ok: true, recoveryCodes };
}
