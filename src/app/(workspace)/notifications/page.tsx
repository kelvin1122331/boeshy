import { Suspense } from "react";
import { Spinner } from "@/components/common";
import { Notifications } from "@/components/workspace/collections";
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <Notifications />
    </Suspense>
  );
}
