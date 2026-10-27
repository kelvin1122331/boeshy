import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminIdentity } from "@/server/admin/access";
import { db } from "@/lib/database";
import { AppError } from "@/lib/errors";
import "./admin.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "Admin Control Center · HOLYAI",
    template: "%s · HOLYAI Admin",
  },
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let identity;
  try {
    identity = await adminIdentity("admin.read", true);
  } catch (error) {
    if (error instanceof AppError && error.status === 401) redirect("/login");
    notFound();
  }
  const mfa = await db.adminMfa.findUnique({
    where: { userId: identity.user.id },
    select: { enabled: true },
  });
  const grant = await db.adminMfaGrant.findUnique({
    where: { sessionId: identity.session.id },
  });
  const mfaRequired =
    !!mfa?.enabled &&
    (!grant ||
      grant.userId !== identity.user.id ||
      grant.expiresAt < new Date());
  return (
    <AdminShell user={identity.user} mfaRequired={mfaRequired}>
      {children}
    </AdminShell>
  );
}
