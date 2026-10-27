export type GradingQuestion = {
  id: string;
  topic: string;
  correctIndex: number;
};
export function gradeExam(
  questions: GradingQuestion[],
  answers: Record<string, number>,
) {
  let correct = 0,
    unanswered = 0;
  const topics: Record<string, { correct: number; total: number }> = {};
  for (const q of questions) {
    topics[q.topic] ??= { correct: 0, total: 0 };
    topics[q.topic].total++;
    if (answers[q.id] === undefined) unanswered++;
    else if (answers[q.id] === q.correctIndex) {
      correct++;
      topics[q.topic].correct++;
    }
  }
  return {
    total: questions.length,
    correct,
    incorrect: questions.length - correct - unanswered,
    unanswered,
    score: questions.length
      ? Math.round((correct / questions.length) * 10000) / 100
      : 0,
    topics,
  };
}
export function shuffleQuestion<
  T extends { options: string[]; correctIndex: number },
>(question: T, random = Math.random): T {
  const pairs = question.options.map((label, index) => ({ label, index }));
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return {
    ...question,
    options: pairs.map((p) => p.label),
    correctIndex: pairs.findIndex((p) => p.index === question.correctIndex),
  };
}
