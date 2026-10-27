import { describe, it, expect } from "vitest";
import { gradeExam, shuffleQuestion } from "@/features/study/grading";
import { routeIntent, features } from "@/config/features";
import { examSchema, rubricSchema } from "@/lib/validation/schemas";
describe("exam grading", () => {
  const questions = [
    { id: "a", topic: "Math", correctIndex: 0 },
    { id: "b", topic: "Math", correctIndex: 4 },
    { id: "c", topic: "Science", correctIndex: 2 },
  ];
  it("distinguishes correct, wrong and unanswered with per-topic accuracy", () => {
    expect(gradeExam(questions, { a: 0, b: 1 })).toEqual({
      total: 3,
      correct: 1,
      incorrect: 1,
      unanswered: 1,
      score: 33.33,
      topics: {
        Math: { correct: 1, total: 2 },
        Science: { correct: 0, total: 1 },
      },
    });
  });
  it("handles zero questions and all correct", () => {
    expect(gradeExam([], {}).score).toBe(0);
    expect(gradeExam(questions, { a: 0, b: 4, c: 2 }).score).toBe(100);
  });
  it("keeps the correct answer paired after option shuffling", () => {
    const input = {
      options: ["one", "two", "three", "four", "five"],
      correctIndex: 3,
    };
    const output = shuffleQuestion(input, () => 0.25);
    expect(output.options[output.correctIndex]).toBe("four");
    expect(new Set(output.options).size).toBe(5);
    expect(input.options[3]).toBe("four");
  });
  it("rejects invalid answer keys, four options and invalid rubric weights", () => {
    expect(
      examSchema.safeParse({
        title: "x",
        questions: Array(5).fill({
          topic: "Math",
          prompt: "x",
          options: ["1", "2", "3", "4"],
          correctIndex: 5,
          explanation: "x",
          source: null,
        }),
      }).success,
    ).toBe(false);
    expect(
      rubricSchema.safeParse({
        title: "x",
        summary: "x",
        warnings: [],
        criteria: [
          {
            name: "x",
            weight: 30,
            score: 70,
            evidence: "x",
            reason: "x",
            suggestion: "x",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
describe("routing", () => {
  it("routes academic and study requests to the intended module", () => {
    expect(routeIntent("Carikan 10 jurnal tentang AI")).toBe(
      "academic-research",
    );
    expect(routeIntent("Buat soal latihan")).toBe("study-exam");
    expect(routeIntent("Buat gambar pemandangan")).toBe("image-generator");
  });
  it("has exactly 18 distinct feature routes", () => {
    expect(new Set(features.map((f) => f.id)).size).toBe(18);
  });
});
