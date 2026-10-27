import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { Admin } from "@/components/settings/admin";
export default async function Page() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return <Admin />;
}
