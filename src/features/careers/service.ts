import { z } from "zod";
import { AppError } from "@/lib/errors";
import { generateJSON } from "@/lib/ai/provider";
const jobsSchema = z.object({
  data: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      company_name: z.string(),
      location: z.string(),
      remote: z.boolean(),
      url: z.url(),
      tags: z.array(z.string()),
      description: z.string(),
    }),
  ),
});
export async function careerMatch(
  userId: string,
  profile: string,
  options: Record<string, string | number | boolean>,
) {
  const r = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new AppError(502, "Sumber lowongan sedang tidak tersedia.");
  const raw = jobsSchema
    .parse(await r.json())
    .data.filter(
      (j) =>
        (!options.remote || j.remote) &&
        (!options.location ||
          j.location
            .toLowerCase()
            .includes(String(options.location).toLowerCase())),
    )
    .slice(0, 30)
    .map((j) => ({
      ...j,
      description: j.description.replace(/<[^>]*>/g, "").slice(0, 2000),
    }));
  if (!raw.length)
    return {
      title: "Kecocokan karier",
      summary: "Tidak ada lowongan yang memenuhi filter pada sumber ini.",
      jobs: [],
      warnings: ["Sumber Arbeitnow tidak mencakup seluruh pasar kerja."],
    };
  const assessment = await generateJSON(
    userId,
    "career-matcher",
    "Match the user profile to ONLY the supplied real jobs. Return at most 10 job slugs and evidence-based reasons, skill gaps, and eligibility questions. Do not invent postings or eligibility. Score is a rough skills estimate, not hiring probability.",
    JSON.stringify({ profile, jobs: raw }),
    z.object({
      summary: z.string(),
      matches: z
        .array(
          z.object({
            slug: z.string(),
            score: z.number().min(0).max(100),
            reason: z.string(),
            gaps: z.array(z.string()),
            eligibility: z.string(),
          }),
        )
        .max(10),
    }),
  );
  return {
    title: "Kecocokan karier",
    summary: assessment.summary,
    jobs: assessment.matches.flatMap((m) => {
      const j = raw.find((j) => j.slug === m.slug);
      return j ? [{ ...j, ...m }] : [];
    }),
    warnings: [
      "Verifikasi tenggat, usia, izin kerja, dan kelayakan di tautan lowongan asli. Sumber: Arbeitnow.",
    ],
  };
}
