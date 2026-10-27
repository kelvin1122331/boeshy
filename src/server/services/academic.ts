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
export async function academicSearch(
  query: string,
  from?: number,
  to?: number,
  openAccess = false,
): Promise<AcademicReference[]> {
  const params = new URLSearchParams({ query, rows: "20", sort: "relevance" });
  const filters = [
    "type:journal-article",
    ...(from ? [`from-pub-date:${from}`] : []),
    ...(to ? [`until-pub-date:${to}`] : []),
    ...(openAccess ? ["has-license:true"] : []),
  ];
  params.set("filter", filters.join(","));
  const response = await fetch(`https://api.crossref.org/works?${params}`, {
    headers: { "User-Agent": "HOLYAI/0.1 (academic metadata search)" },
    signal: AbortSignal.timeout(20000),
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
