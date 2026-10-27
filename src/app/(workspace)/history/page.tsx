import { Suspense } from "react";
import { Spinner } from "@/components/common";
import { History } from "@/components/workspace/collections";
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <History />
    </Suspense>
  );
}
