import { Projects } from "@/components/workspace/collections";
export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  return <Projects projectId={(await params).projectId} />;
}
