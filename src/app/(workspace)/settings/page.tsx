import { Suspense } from "react";
import { Spinner } from "@/components/common";
import { Settings } from "@/components/settings/settings";
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <Settings />
    </Suspense>
  );
}
