import { generateJSON } from "@/lib/ai/provider";
import {
  documentSchema,
  rubricSchema,
  defenseSchema,
  matrixSchema,
} from "@/lib/validation/schemas";
const instructions: Record<string, string> = {
  paraphrase:
    "Rewrite the supplied text according to chosen tone. Preserve meaning, citations, data, numbers and exact quotations. Return sections: Revised text, Changes explained, Suggestions. Do not assert plagiarism freedom.",
  "methodology-checker":
    "Evaluate objectives-method alignment, design, variables, sampling, validity, reliability, collection, analysis, bias, limitations, ethics and research-question consistency. Report strengths, weaknesses, missing information, improvements and questions. Ground every criticism in supplied text.",
  "originality-checker":
    "Review repeated phrases, citation consistency, attribution gaps, academic style and clarity. Explain that no external similarity database was searched and no plagiarism percentage is available. Return separate sections per type of review. Do not help evade detection.",
  "notes-summarizer":
    "Create source-grounded study notes according to selected summary depth. Include main ideas, key terms, structured notes, flashcards (question/answer) and practice questions. Preserve source page markers when available. Do not invent source content.",
};
export async function writingService(
  userId: string,
  kind: string,
  input: string,
) {
  if (kind === "rubric-checker")
    return generateJSON(
      userId,
      kind,
      "Evaluate the task against the supplied rubric ONLY. Extract criteria and normalize weights to 100; never invent missing criteria, request clarification in warnings when weights are absent. Scores are estimates, not teacher grades. Each score needs textual evidence and actionable feedback.",
      input,
      rubricSchema,
    );
  if (kind === "journal-matrix")
    return generateJSON(
      userId,
      kind,
      'Compare the 2–20 uploaded journal documents. Extract fields separately for each, with filename/section/page in source. Any missing field MUST be "Tidak ditemukan". Do not invent study findings, authors, dates or gaps. Provide a grounded synthesis.',
      input,
      matrixSchema,
    );
  if (kind === "defense-simulator")
    return generateJSON(
      userId,
      kind,
      "Act as a critical professional academic examiner. Ask ONE next question grounded in the supplied material. If an answer is provided, assess that answer using concept understanding, accuracy, argument, logic, clarity and structure, scores 0–10 with transparent reasons. Give stronger answer structure only after an answer. On first turn feedback is empty, scores is empty and strongerAnswer is empty. Do not infer emotions.",
      input,
      defenseSchema,
    );
  return generateJSON(
    userId,
    kind,
    instructions[kind] ||
      "Review the supplied text carefully and produce an evidence-based report.",
    input,
    documentSchema,
  );
}
