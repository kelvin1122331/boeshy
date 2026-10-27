export type { AcademicReference } from "@/server/services/academic";
import type { AcademicReference } from "@/server/services/academic";
export function formatCitation(r: AcademicReference, style: string) {
  const names = r.authors.length
      ? r.authors.join(", ")
      : "[Penulis belum terverifikasi]",
    year = r.year ?? "[Tahun belum terverifikasi]";
  if (style === "IEEE")
    return `${names}, “${r.title},” ${r.publication}, ${year}. ${r.doi ? `doi: ${r.doi}` : ""}`;
  if (style === "Vancouver")
    return `${names}. ${r.title}. ${r.publication}. ${year}. ${r.url}`;
  return `${names} (${year}). ${r.title}. ${r.publication}. ${r.url}`;
}
