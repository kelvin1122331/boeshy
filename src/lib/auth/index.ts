import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/database";
import { removeFile } from "@/lib/storage";
async function sendMail(to: string, subject: string, url: string) {
  if (!process.env.RESEND_API_KEY)
    throw new Error("Email provider requires configuration");
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text: `${subject}\n\n${url}\n\nAbaikan pesan ini jika bukan kamu yang meminta.`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!result.ok) throw new Error("Email delivery failed");
}
export const auth = betterAuth({
  appName: "HOLYAI",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  databaseHooks: {
    user: {
      delete: {
        before: async (user) => {
          const files = await db.projectFile.findMany({
            where: { userId: user.id },
            select: { key: true },
          });
          const assets = await db.generatedAsset.findMany({
            where: { job: { userId: user.id } },
            select: { key: true },
          });
          const imports = await db.generationJob.findMany({
            where: { userId: user.id, kind: "canva-url-imports" },
            select: { input: true },
          });
          for (const key of [...files, ...assets]
            .map((f) => f.key)
            .concat(
              imports.flatMap((j) => {
                const input = j.input as { key?: string };
                return input.key ? [input.key] : [];
              }),
            ))
            await removeFile(key);
          await db.auditLog.create({
            data: { userId: user.id, action: "account.deleted" },
          });
        },
      },
    },
  },
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  trustedOrigins: [process.env.APP_URL || "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification:
      process.env.REQUIRE_EMAIL_VERIFICATION !== "false",
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) =>
      sendMail(user.email, "Reset kata sandi HOLYAI", url),
  },
  emailVerification: {
    sendOnSignUp: process.env.REQUIRE_EMAIL_VERIFICATION !== "false",
    sendVerificationEmail: async ({ user, url }) =>
      sendMail(user.email, "Verifikasi email HOLYAI", url),
  },
  user: {
    deleteUser: { enabled: true },
    additionalFields: {
      role: { type: "string", defaultValue: "user", input: false },
      timezone: { type: "string", defaultValue: "Asia/Jakarta" },
      language: { type: "string", defaultValue: "id" },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, window: 60, max: 30 },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
});
