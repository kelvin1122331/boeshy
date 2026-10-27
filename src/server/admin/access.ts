import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { hasPermission, type Permission } from "@/lib/permissions";
export async function adminIdentity(
  permission: Permission = "admin.read",
  mfaBypass = false,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new AppError(401, "Masuk untuk membuka Control Center.");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user || !hasPermission(user.role, permission))
    throw new AppError(
      403,
      "Akses administrator dengan izin yang sesuai diperlukan.",
    );
  if (!mfaBypass) {
    const mfa = await db.adminMfa.findUnique({
      where: { userId: user.id },
      select: { enabled: true },
    });
    if (mfa?.enabled) {
      const grant = await db.adminMfaGrant.findUnique({
        where: { sessionId: session.session.id },
      });
      if (!grant || grant.userId !== user.id || grant.expiresAt < new Date())
        throw new AppError(428, "Verifikasi MFA admin diperlukan.");
    }
  }
  return { user, session: session.session };
}
export async function auditAdmin(
  userId: string,
  action: string,
  resourceId?: string,
  metadata?: Record<string, string | number | boolean | null>,
) {
  await db.auditLog.create({
    data: { userId, action: `admin.${action}`, resourceId, metadata },
  });
}
