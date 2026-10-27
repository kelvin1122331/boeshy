import { Suspense } from "react";
import { Chat } from "@/components/chat/chat";
export default async function Page({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return (
    <Suspense>
      <Chat key={conversationId} conversationId={conversationId} />
    </Suspense>
  );
}
