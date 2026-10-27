import { Suspense } from "react";
import { Spinner } from "@/components/common";
import { Chat } from "@/components/chat/chat";
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <Chat />
    </Suspense>
  );
}
