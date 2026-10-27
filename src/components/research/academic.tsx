"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Icon,
  Alert,
  Empty,
  CopyButton,
  Field,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { api, useAPI, type Item } from "@/hooks/use-api";
import {
  formatCitation,
  type AcademicReference,
} from "@/features/academic/citation";
export function Academic() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("prompt") || ""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [open, setOpen] = useState(false),
    [style, setStyle] = useState("APA 7th"),
    [results, setResults] = useState<AcademicReference[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { data: history, reload } = useAPI<Item[]>(
    "items?kind=academic-research",
  );
  useEffect(() => {
    const id = params.get("item");
    if (id)
      api<Item>(`items/${id}`)
        .then((item) => {
          if (item.kind === "academic-research") {
            setQuery(item.title);
            setResults(item.data.references as AcademicReference[]);
          }
        })
        .catch((e) => setError(e.message));
  }, [params]);
  async function search() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ references: AcademicReference[] }>("academic", {
        method: "POST",
        body: JSON.stringify({
          query,
          from: from ? Number(from) : undefined,
          to: to ? Number(to) : undefined,
          openAccess: open,
        }),
      });
      setResults(r.references);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <PageHeader
        eyebrow="Research & Academic"
        title="Academic Research"
        description="Mulai dari sumber yang bisa ditelusuri. Temukan jurnal, simpan referensi, dan bangun landasan risetmu."
      />
      <div className="panel">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <div className="search-bar">
            <input
              aria-label="Topik penelitian atau DOI"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Topik penelitian, kata kunci, atau DOI…"
              required
              minLength={2}
            />
            <Button disabled={busy}>
              <Icon name="Search" size={17} />
              {busy ? "Mencari…" : "Temukan jurnal"}
            </Button>
          </div>
          <div className="academic-filters">
            <Field label="Dari tahun">
              <input
                type="number"
                min="1800"
                max="2100"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="2020"
              />
            </Field>
            <Field label="Sampai tahun">
              <input
                type="number"
                min="1800"
                max="2100"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="2026"
              />
            </Field>
            <Field label="Gaya sitasi">
              <select value={style} onChange={(e) => setStyle(e.target.value)}>
                {["APA 7th", "IEEE", "Harvard", "Vancouver"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Metadata lisensi tersedia">
              <input
                type="checkbox"
                checked={open}
                onChange={(e) => setOpen(e.target.checked)}
              />
            </Field>
          </div>
        </form>
      </div>
      {error && <Alert error>{error}</Alert>}
      <div className="academic-results">
        {results.length > 0 ? (
          <>
            <div className="flex-between">
              <span className="badge">
                {results.length} hasil dari Crossref
              </span>
              <CopyButton
                text={results.map((r) => formatCitation(r, style)).join("\n\n")}
              />
            </div>
            <Alert>
              Metadata berasal dari Crossref. Kelengkapan penulis, tahun,
              volume, halaman, dan lisensi perlu diverifikasi di sumber asli;
              sitasi yang ditampilkan adalah draf.
            </Alert>
            {results.map((r) => (
              <article className="panel reference-card" key={r.id}>
                <div className="flex-between">
                  <span className="eyebrow">{r.publication}</span>
                  <span className="badge">
                    {r.year || "Tahun belum terverifikasi"}
                  </span>
                </div>
                <h3>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                </h3>
                <div className="reference-meta">
                  {r.authors.join(" · ") || "Penulis belum terverifikasi"}
                </div>
                {r.abstract ? (
                  <p>{r.abstract}</p>
                ) : (
                  <p>
                    Abstrak tidak tersedia pada metadata Crossref. Buka sumber
                    untuk membaca abstrak dan dokumen asli.
                  </p>
                )}
                <div className="citation-text">{formatCitation(r, style)}</div>
                <div className="reference-bottom">
                  <a
                    className="text-link"
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Buka DOI asli <Icon name="ArrowUpRight" size={14} />
                  </a>
                  <CopyButton text={formatCitation(r, style)} />
                </div>
              </article>
            ))}
          </>
        ) : (
          <div className="panel">
            <Empty
              icon="GraduationCap"
              title="Penelitian yang baik dimulai dari sumber yang tepat"
              description="Telusuri metadata jurnal asli. Kami tidak membuat judul, penulis, atau DOI rekaan."
            />
          </div>
        )}
      </div>
      {history && history.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <div className="section-heading">
            <h2>Penelusuran tersimpan</h2>
            <Link href="/journal-matrix" className="text-link">
              Bandingkan jurnal <Icon name="ArrowRight" size={15} />
            </Link>
          </div>
          <div className="activity-list">
            {history.map((h) => (
              <a
                href="#"
                key={h.id}
                onClick={(e) => {
                  e.preventDefault();
                  setQuery(h.title);
                  setResults(h.data.references as AcademicReference[]);
                }}
              >
                <span className="activity-icon">
                  <Icon name="Search" />
                </span>
                <b>{h.title}</b>
                <time>{new Date(h.createdAt).toLocaleDateString("id-ID")}</time>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
