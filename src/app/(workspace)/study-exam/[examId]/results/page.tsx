import { Suspense } from "react";
import { ExamPlayer } from "@/components/study/exam";
export default async function Page({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  return (
    <Suspense>
      <ExamPlayer examId={(await params).examId} results />
    </Suspense>
  );
}
