import { resolveService } from "@/server/admin/router";
import { rateLimit } from "@/lib/queue";
import { z } from "zod";
import { AppError } from "@/lib/errors";
export type AcademicReference = {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  publication: string;
  doi: string | null;
  url: string;
  abstract: string | null;
  openAccess: boolean;
  verified: boolean;
};
const crossrefSchema = z.object({
  message: z.object({
    items: z.array(
      z.object({
        DOI: z.string(),
        title: z.array(z.string()).optional(),
        author: z
          .array(
            z.object({
              given: z.string().optional(),
              family: z.string().optional(),
            }),
          )
          .optional(),
        "container-title": z.array(z.string()).optional(),
        published: z
          .object({ "date-parts": z.array(z.array(z.number())) })
          .optional(),
        URL: z.string().optional(),
        abstract: z.string().optional(),
        license: z.array(z.object({ URL: z.string() })).optional(),
      }),
    ),
  }),
});
type AcademicEntry = {
  id?: string;
  paperId?: string;
  title?: string;
  display_name?: string;
  authors?: { name?: string }[];
  authorships?: { author?: { display_name?: string } }[];
  publication_year?: number;
  year?: number;
  primary_location?: { source?: { display_name?: string } };
  venue?: string;
  doi?: string;
  externalIds?: { DOI?: string };
  url?: string;
  abstract?: string;
  open_access?: { is_oa?: boolean };
  isOpenAccess?: boolean;
};
export async function academicSearch(
  query: string,
  from?: number,
  to?: number,
  openAccess = false,
): Promise<AcademicReference[]> {
  const config = await resolveService("academic");
  await rateLimit("provider:" + config.id, config.requestLimit);
  if (config.id !== "crossref") {
    const url = new URL(
      config.endpoint + (config.id === "openalex" ? "/works" : "/paper/search"),
    );
    url.searchParams.set(config.id === "openalex" ? "search" : "query", query);
    url.searchParams.set(config.id === "openalex" ? "per_page" : "limit", "20");
    if (config.id === "semantic-scholar")
      url.searchParams.set(
        "fields",
        "title,authors,year,venue,externalIds,url,abstract,isOpenAccess",
      );
    const headers: Record<string, string> = {};
    if (config.secrets.apiKey)
      headers[config.id === "openalex" ? "Authorization" : "x-api-key"] =
        config.id === "openalex"
          ? "Bearer " + config.secrets.apiKey
          : config.secrets.apiKey;
    const response = await fetch(url, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    if (!response.ok)
      throw new AppError(502, "Layanan metadata akademik belum tersedia.");
    const data = await response.json();
    const entries = config.id === "openalex" ? data.results : data.data;
    if (!Array.isArray(entries))
      throw new AppError(502, "Format metadata akademik tidak valid.");
    return entries
      .map((entry: AcademicEntry) => ({
        id: String(entry.id || entry.paperId),
        title: String(
          entry.title || entry.display_name || "Judul belum tersedia",
        ),
        authors: (config.id === "openalex"
          ? entry.authorships || []
          : entry.authors || []
        ).map((a: { name?: string; author?: { display_name?: string } }) =>
          String(a.name || a.author?.display_name || ""),
        ),
        year: entry.publication_year || entry.year || null,
        publication:
          entry.primary_location?.source?.display_name ||
          entry.venue ||
          "Belum tersedia",
        doi: entry.doi
          ? String(entry.doi).replace("https://doi.org/", "")
          : entry.externalIds?.DOI || null,
        url:
          entry.doi ||
          entry.url ||
          entry.id ||
          "https://www.semanticscholar.org/paper/" + entry.paperId,
        abstract: entry.abstract || null,
        openAccess: !!(entry.open_access?.is_oa || entry.isOpenAccess),
        verified: true,
      }))
      .filter(
        (entry: AcademicReference) =>
          (!from || (!!entry.year && entry.year >= from)) &&
          (!to || (!!entry.year && entry.year <= to)) &&
          (!openAccess || entry.openAccess),
      );
  }
  const params = new URLSearchParams({
    query,
    rows: String((config.settings as { maxResults?: number }).maxResults || 20),
    sort: "relevance",
  });
  const contact = (config.settings as { contactEmail?: string }).contactEmail;
  if (contact) params.set("mailto", contact);
  const filters = [
    "type:journal-article",
    ...(from ? [`from-pub-date:${from}`] : []),
    ...(to ? [`until-pub-date:${to}`] : []),
    ...(openAccess ? ["has-license:true"] : []),
  ];
  params.set("filter", filters.join(","));
  const response = await fetch(config.endpoint + "/works?" + params, {
    headers: { "User-Agent": "HOLYAI/0.1 (academic metadata search)" },
    signal: AbortSignal.timeout(config.timeoutMs),
    redirect: "error",
  });
  if (!response.ok)
    throw new AppError(502, "Crossref sedang tidak tersedia. Coba kembali.");
  const parsed = crossrefSchema.parse(await response.json());
  return parsed.message.items.map((x) => ({
    id: x.DOI,
    title: x.title?.[0] || "Judul belum terverifikasi",
    authors: (x.author || []).map((a) =>
      [a.given, a.family].filter(Boolean).join(" "),
    ),
    year: x.published?.["date-parts"][0]?.[0] || null,
    publication: x["container-title"]?.[0] || "Belum terverifikasi",
    doi: x.DOI,
    url: `https://doi.org/${encodeURI(x.DOI)}`,
    abstract: x.abstract?.replace(/<[^>]+>/g, "") || null,
    openAccess: !!x.license?.some((l) =>
      /creativecommons|open-access/i.test(l.URL),
    ),
    verified: true,
  }));
}
export function formatCitation(r: AcademicReference, style: string) {
  const names = r.authors.length
    ? r.authors.join(", ")
    : "[Penulis belum terverifikasi]";
  const year = r.year ?? "[tahun belum terverifikasi]";
  if (style === "IEEE")
    return `${names}, “${r.title},” ${r.publication}, ${year}. ${r.doi ? `doi: ${r.doi}` : ""}`;
  if (style === "Vancouver")
    return `${names}. ${r.title}. ${r.publication}. ${year}. ${r.url}`;
  return `${names} (${year}). ${r.title}. ${r.publication}. ${r.url}`;
}
