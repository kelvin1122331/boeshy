import { redirect, notFound } from "next/navigation";
import { adminSections } from "@/config/admin";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { adminIdentity } from "@/server/admin/access";
import type { Permission } from "@/lib/permissions";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const path = (await params).section?.join("/");
  if (!path) redirect("/admin/overview");
  const section = adminSections.find((item) => item.id === path);
  if (!section) notFound();
  const permission: Permission = ["users", "roles"].includes(path)
    ? "users.read"
    : [
          "ai-providers",
          "api-credentials",
          "models",
          "ai-routing",
          "features",
        ].includes(path) || path.startsWith("integrations/")
      ? "providers.read"
      : ["settings", "security", "notifications"].includes(path)
        ? "admin.read"
        : "monitoring.read";
  let identity;
  try {
    identity = await adminIdentity(permission, true);
  } catch {
    notFound();
  }
  return <AdminWorkspace section={section.id} role={identity.user.role} />;
}
