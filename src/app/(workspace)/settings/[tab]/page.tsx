import { notFound } from "next/navigation";
import { Settings } from "@/components/settings/settings";
export default async function Page({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (
    !["profile", "appearance", "integrations", "usage", "privacy"].includes(tab)
  )
    notFound();
  return <Settings tab={tab} />;
}
