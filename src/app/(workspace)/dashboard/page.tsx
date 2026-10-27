import { requireUser } from "@/lib/auth/guard";
import { Dashboard } from "@/components/dashboard/dashboard";
export default async function DashboardPage() {
  const user = await requireUser();
  return <Dashboard name={user.name} />;
}
