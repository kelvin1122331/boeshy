import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { gradeExam } from "@/features/study/grading";
const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(4),
});
async function ownedExam(userId: string, id: string) {
  const exam = await db.exam.findFirst({
    where: { id, userId },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!exam) throw new AppError(404, "Ujian tidak ditemukan.");
  return exam;
}
export async function examAction(
  userId: string,
  path: string[],
  method: string,
  body: unknown,
) {
  const [id, action, attemptId] = path;
  if (!id)
    return db.exam.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        mode: true,
        createdAt: true,
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  const exam = await ownedExam(userId, id);
  if (action === "retry" && method === "POST") {
    const input = z.object({ attemptId: z.string().uuid() }).parse(body);
    const attempt = await db.examAttempt.findFirst({
      where: {
        id: input.attemptId,
        examId: id,
        userId,
        submittedAt: { not: null },
      },
      include: { answers: true },
    });
    if (!attempt) throw new AppError(404, "Hasil ujian tidak ditemukan.");
    const answers = Object.fromEntries(
      attempt.answers.map((a) => [a.questionId, a.selectedIndex]),
    );
    const incorrect = exam.questions.filter(
      (q) => q.correctIndex !== answers[q.id],
    );
    if (!incorrect.length)
      throw new AppError(
        400,
        "Semua jawaban sudah benar. Buat ujian baru untuk tantangan berikutnya.",
      );
    return db.exam.create({
      data: {
        userId,
        title: `Latihan ulang: ${exam.title}`,
        mode: "practice",
        material: exam.material,
        questions: {
          create: incorrect.map((q, position) => ({
            position,
            topic: q.topic,
            prompt: q.prompt,
            options: q.options as Prisma.InputJsonValue,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            source: q.source,
          })),
        },
      },
      select: { id: true },
    });
  }
  if (action === "attempts" && method === "POST" && !attemptId) {
    const attempt = await db.examAttempt.create({
      data: { examId: id, userId },
    });
    return { id: attempt.id };
  }
  if (!action)
    return {
      id: exam.id,
      title: exam.title,
      mode: exam.mode,
      durationMinutes: exam.durationMinutes,
      questions: exam.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        topic: q.topic,
        options: q.options,
        position: q.position,
      })),
      attempts: await db.examAttempt.findMany({
        where: { examId: id, userId },
        select: { id: true, startedAt: true, submittedAt: true, score: true },
        orderBy: { startedAt: "desc" },
      }),
    };
  if (action !== "attempts" || !attemptId)
    throw new AppError(404, "Rute ujian tidak ditemukan.");
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT id FROM "ExamAttempt" WHERE id=${attemptId} AND "userId"=${userId} FOR UPDATE`;
    const attempt = await tx.examAttempt.findFirst({
      where: { id: attemptId, userId, examId: id },
      include: { answers: true },
    });
    if (!attempt) throw new AppError(404, "Sesi ujian tidak ditemukan.");
    const expired =
      !!exam.durationMinutes &&
      Date.now() > attempt.startedAt.getTime() + exam.durationMinutes * 60000;
    if (method === "PATCH") {
      if (attempt.submittedAt || expired)
        throw new AppError(
          409,
          "Ujian sudah selesai atau waktu habis. Kirim jawaban untuk melihat hasil.",
        );
      const answer = answerSchema.parse(body);
      if (!exam.questions.some((q) => q.id === answer.questionId))
        throw new AppError(400, "Soal bukan bagian ujian ini.");
      await tx.examAnswer.upsert({
        where: {
          attemptId_questionId: { attemptId, questionId: answer.questionId },
        },
        create: { attemptId, ...answer },
        update: { selectedIndex: answer.selectedIndex },
      });
      const q = exam.questions.find((q) => q.id === answer.questionId)!;
      return exam.mode === "practice"
        ? {
            saved: true,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
          }
        : { saved: true };
    }
    if (method === "POST" && !attempt.submittedAt) {
      const result = gradeExam(
        exam.questions,
        Object.fromEntries(
          attempt.answers.map((a) => [a.questionId, a.selectedIndex]),
        ),
      );
      await tx.examAttempt.update({
        where: { id: attemptId },
        data: { submittedAt: new Date(), score: result.score },
      });
      attempt.submittedAt = new Date();
      attempt.score = result.score;
    }
    const answers = Object.fromEntries(
      attempt.answers.map((a) => [a.questionId, a.selectedIndex]),
    );
    return {
      ...attempt,
      answers,
      ...(attempt.submittedAt
        ? {
            result: gradeExam(exam.questions, answers),
            review: exam.questions.map((q) => ({
              ...q,
              selectedIndex: answers[q.id] ?? null,
            })),
            recommendations: Object.entries(
              gradeExam(exam.questions, answers).topics,
            )
              .filter(([, t]) => t.correct < t.total)
              .map(
                ([topic]) =>
                  `Pelajari kembali ${topic}, lalu kerjakan ulang soal yang salah.`,
              ),
          }
        : {}),
    };
  });
}
