import { z } from "zod";
import { AppError } from "@/lib/errors";
import { generateJSON } from "@/lib/ai/provider";
import { documentSchema } from "@/lib/validation/schemas";
const searchSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.url(),
      content: z.string(),
      score: z.number().optional(),
    }),
  ),
});
export async function searchWeb(
  query: string,
  options: Record<string, string | number | boolean> = {},
) {
  if (!process.env.TAVILY_API_KEY)
    throw new AppError(
      503,
      "Requires Configuration: atur TAVILY_API_KEY untuk pencarian web.",
    );
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: 10,
      topic: options.focus === "Berita" ? "news" : "general",
      ...(options.from ? { start_date: options.from } : {}),
      ...(options.to ? { end_date: options.to } : {}),
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) throw new AppError(502, "Penyedia pencarian gagal merespons.");
  return searchSchema
    .parse(await r.json())
    .results.filter((s, i, a) => a.findIndex((x) => x.url === s.url) === i)
    .map((s, i) => ({
      ...s,
      id: i + 1,
      domain: new URL(s.url).hostname,
      credibility: "Belum diverifikasi secara independen",
    }));
}
export async function deepResearch(
  userId: string,
  query: string,
  options: Record<string, string | number | boolean>,
  stage: (stage: string) => Promise<void>,
) {
  await stage("planning");
  const plan = await generateJSON(
    userId,
    "deep-search",
    "Create 3 focused search questions for the research. Do not answer the questions.",
    query,
    z.object({ questions: z.array(z.string()).min(1).max(3) }),
  );
  await stage("searching");
  const batches = [];
  for (const question of plan.questions)
    batches.push(await searchWeb(question, options));
  await stage("reading");
  const sources = batches
    .flat()
    .filter((s, i, a) => a.findIndex((x) => x.url === s.url) === i)
    .slice(0, 20)
    .map((s, i) => ({ ...s, id: i + 1 }));
  await stage("analyzing");
  const report = await generateJSON(
    userId,
    "deep-search",
    "Synthesize a research report only from supplied search excerpts. Distinguish facts, opinion and unverified claims. Cite [n] using source IDs. Explain evidence limits, disagreements and next research steps. Do not claim full webpages were read.",
    JSON.stringify({ query, plan, sources }),
    documentSchema,
  );
  await stage("synthesizing");
  return { ...report, sources, plan: plan.questions };
}
