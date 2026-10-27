import { Suspense } from "react";
import { Spinner } from "@/components/common";
import { Projects } from "@/components/workspace/collections";
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <Projects />
    </Suspense>
  );
}
