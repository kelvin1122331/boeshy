import { generateJSON } from "@/lib/ai/provider";
import { documentSchema, slidesSchema } from "@/lib/validation/schemas";
export async function documentService(
  userId: string,
  kind: string,
  input: string,
  stage: string,
) {
  if (kind === "presentation-studio")
    return generateJSON(
      userId,
      kind,
      "Create a presentation with the requested slide count, language, audience, duration and theme. At outline stage provide concise slide headings and proposed points for user review; at draft stage produce final editable bullet content, speaker notes and visual suggestions. Use short bullets; references only from supplied sources.",
      input,
      slidesSchema,
    );
  const instruction =
    kind === "book-creator"
      ? "Create a coherent book with concept, table of contents and chapter structure matching genre, audience, language and style. At outline stage only produce concept and chapter outlines, not full chapters. At draft stage expand the approved outline into original chapter drafts. Maintain continuity, do not imitate copyrighted passages. Include a summary."
      : "Build a structured academic document matching document type, citation style, institution and target length. At outline stage produce headings and what each needs; at draft stage expand the approved outline. Never fabricate experiments, data, results, citations or bibliography. Clearly label missing research data [DATA BELUM TERSEDIA]. Adapt structure to document type.";
  return generateJSON(
    userId,
    kind,
    `${instruction}\nCurrent stage: ${stage}. Long book drafts are constrained by output limits; make this limit explicit in warnings when needed.`,
    input,
    documentSchema,
  );
}
