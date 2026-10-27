import { resolveService } from "@/server/admin/router";
import { rateLimit } from "@/lib/queue";
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
  const config = await resolveService("jobs");
  await rateLimit("provider:" + config.id, config.requestLimit);
  const settings = config.settings as {
    defaultCountry?: string;
    countries?: string[];
    maxResults?: number;
  };
  const country = settings.defaultCountry || "gb";
  if (
    config.id === "adzuna" &&
    (country === "id" ||
      (settings.countries?.length && !settings.countries.includes(country)))
  )
    throw new AppError(
      400,
      "Wilayah belum didukung konfigurasi provider ini. Pilih sumber lain atau negara yang tercakup.",
    );
  const endpoint =
    config.id === "adzuna"
      ? config.endpoint +
        "/jobs/" +
        country +
        "/search/1?" +
        new URLSearchParams({
          app_id: config.secrets.appId,
          app_key: config.secrets.appKey,
          results_per_page: String(Math.min(settings.maxResults || 20, 50)),
          what: String(options.query || profile.slice(0, 100)),
          ...(options.location ? { where: String(options.location) } : {}),
        })
      : config.endpoint + "/job-board-api";
  const r = await fetch(endpoint, {
    redirect: "error",
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  if (!r.ok) throw new AppError(502, "Sumber lowongan sedang tidak tersedia.");
  const response = await r.json();
  const normalized =
    config.id === "adzuna"
      ? {
          data: z
            .array(
              z.object({
                id: z.string(),
                title: z.string(),
                company: z.object({ display_name: z.string() }),
                location: z.object({ display_name: z.string() }),
                redirect_url: z.url(),
                description: z.string(),
                category: z.object({ label: z.string() }).optional(),
              }),
            )
            .parse(response.results)
            .map((job) => ({
              slug: job.id,
              title: job.title,
              company_name: job.company.display_name,
              location: job.location.display_name,
              remote: false,
              url: job.redirect_url,
              tags: job.category ? [job.category.label] : [],
              description: job.description,
            })),
        }
      : response;
  const raw = jobsSchema
    .parse(normalized)
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
      warnings: [
        "Sumber lowongan tidak mencakup seluruh pasar kerja dan wilayah.",
      ],
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
