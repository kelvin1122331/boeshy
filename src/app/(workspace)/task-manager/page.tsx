import { Suspense } from "react";
import { Spinner } from "@/components/common";
import { TaskManager } from "@/components/tasks/task-manager";
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <TaskManager />
    </Suspense>
  );
}
