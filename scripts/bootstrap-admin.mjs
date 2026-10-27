// Run only from the trusted deployment environment. Never expose this as an HTTP endpoint.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const emailIndex = process.argv.indexOf("--email");
const email = emailIndex >= 0 ? process.argv[emailIndex + 1] : null;
if (!email) {
  console.error(
    "Usage: node scripts/bootstrap-admin.mjs --email <existing-account-email> [--reset-mfa]",
  );
  process.exit(1);
}
const db = new PrismaClient();
try {
  const user = await db.user.findUnique({ where: { email } });
  if (!user)
    throw new Error("Create this account through normal registration first.");
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: "super_admin" },
    });
    if (process.argv.includes("--reset-mfa")) {
      await tx.adminMfa.deleteMany({ where: { userId: user.id } });
      await tx.adminMfaGrant.deleteMany({ where: { userId: user.id } });
    }
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: process.argv.includes("--reset-mfa")
          ? "admin.bootstrap.mfa_reset"
          : "admin.bootstrap.super_admin",
        resourceId: user.id,
      },
    });
  });
  console.log(
    "Existing account granted Super Admin access. No password or provider credential was changed.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
