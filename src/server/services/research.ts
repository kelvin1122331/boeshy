import { resolveService } from "@/server/admin/router";
import { rateLimit } from "@/lib/queue";
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
  const config = await resolveService("search");
  await rateLimit("provider:" + config.id, config.requestLimit);
  const settings = config.settings as { maxResults?: number };
  const r = await fetch(
    config.id === "brave"
      ? config.endpoint +
          "/web/search?" +
          new URLSearchParams({
            q: query,
            count: String(Math.min(settings.maxResults || 10, 20)),
          })
      : config.endpoint + "/search",
    {
      method: config.id === "brave" ? "GET" : "POST",
      redirect: "error",
      headers:
        config.id === "brave"
          ? { "X-Subscription-Token": config.secrets.apiKey }
          : {
              "Content-Type": "application/json",
              Authorization: "Bearer " + config.secrets.apiKey,
            },
      body:
        config.id === "brave"
          ? undefined
          : JSON.stringify({
              query,
              search_depth: "advanced",
              max_results: Math.min(settings.maxResults || 10, 20),
              topic: options.focus === "Berita" ? "news" : "general",
              ...(options.from ? { start_date: options.from } : {}),
              ...(options.to ? { end_date: options.to } : {}),
            }),
      signal: AbortSignal.timeout(config.timeoutMs),
    },
  );
  if (!r.ok) throw new AppError(502, "Penyedia pencarian gagal merespons.");
  const response = await r.json();
  const normalized =
    config.id === "brave"
      ? {
          results: (response.web?.results || []).map(
            (entry: { title: string; url: string; description?: string }) => ({
              title: entry.title,
              url: entry.url,
              content: entry.description || "",
            }),
          ),
        }
      : response;
  return searchSchema
    .parse(normalized)
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
