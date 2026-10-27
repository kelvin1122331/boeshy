import { generateJSON } from "@/lib/ai/provider";
import { db } from "@/lib/database";
import { examSchema } from "@/lib/validation/schemas";
import { shuffleQuestion } from "./grading";
import { AppError } from "@/lib/errors";
export async function createExam(
  userId: string,
  material: string,
  options: Record<string, string | number | boolean>,
) {
  const count = Number(options.count || 10);
  if (![5, 10, 20, 30, 40, 50].includes(count))
    throw new AppError(400, "Jumlah soal tidak valid.");
  const output = await generateJSON(
    userId,
    "study-exam",
    `Create exactly ${count} distinct multiple choice questions based ONLY on the material. Five options each, precisely one best correct answer. Difficulty: ${options.difficulty || "mixed"}. Include topic, clear explanation and source page/section when present.`,
    material,
    examSchema,
  );
  if (output.questions.length !== count)
    throw new AppError(502, "Jumlah soal dari AI tidak sesuai. Coba kembali.");
  const questions = output.questions.map((q) =>
    options.shuffleAnswers ? shuffleQuestion(q) : q,
  );
  if (options.shuffleQuestions) questions.sort(() => Math.random() - 0.5);
  return db.exam.create({
    data: {
      userId,
      title: output.title,
      material,
      mode: options.mode === "practice" ? "practice" : "exam",
      durationMinutes: Number(options.timer) || null,
      questions: {
        create: questions.map((q, position) => ({ ...q, position })),
      },
    },
    select: { id: true, title: true },
  });
}
