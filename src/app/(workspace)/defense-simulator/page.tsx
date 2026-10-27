import { Suspense } from "react";
import { Spinner } from "@/components/common";
import { ToolWorkspace } from "@/components/generator/tool-workspace";
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ToolWorkspace id="defense-simulator" />
    </Suspense>
  );
}
