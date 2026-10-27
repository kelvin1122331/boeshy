"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Item } from "@/hooks/use-api";
import { Icon, Alert, CopyButton, Field } from "@/components/common";
import { Button } from "@/components/ui/button";
import { textFromData } from "@/lib/utils/document-text";
type Section = { heading: string; body: string };
type Slide = {
  title: string;
  bullets: string[];
  notes: string;
  visual: string;
};
export function ResultEditor({
  item,
  onChange,
}: {
  item: Item;
  onChange?: (item: Item) => void;
}) {
  const [data, setData] = useState(item.data),
    [title, setTitle] = useState(item.title),
    [active, setActive] = useState(0),
    [editing, setEditing] = useState(false),
    [saved, setSaved] = useState("Tersimpan"),
    [error, setError] = useState(""),
    [filter, setFilter] = useState(""),
    [projectId, setProjectId] = useState(item.projectId || "");
  const mounted = useRef(false);
  const [canva, setCanva] = useState<{
    id: string;
    type: string;
    status: string;
    designId?: string;
    editUrl?: string;
    urls?: string[];
  } | null>(null);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const t = setTimeout(async () => {
      setSaved("Menyimpan…");
      try {
        const result = await api<Item>(`items/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, data }),
        });
        setSaved("Tersimpan");
        onChange?.(result);
      } catch (e) {
        setError((e as Error).message);
        setSaved("Belum tersimpan");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [data, title, item.id, onChange]);
  useEffect(() => {
    if (!canva || ["success", "failed"].includes(canva.status)) return;
    const t = setInterval(async () => {
      try {
        const r = await api<{
          job: {
            id: string;
            status: string;
            result?: {
              designs?: { id: string; urls?: { edit_url?: string } }[];
              urls?: string[];
            };
          };
        }>(`/api/integrations/canva/status?id=${canva.id}&type=${canva.type}`);
        const d = r.job.result?.designs?.[0];
        setCanva({
          ...canva,
          status: r.job.status,
          designId: d?.id || canva.designId,
          editUrl: d?.urls?.edit_url || canva.editUrl,
          urls: r.job.result?.urls,
        });
      } catch (e) {
        setError((e as Error).message);
        setCanva({ ...canva, status: "failed" });
      }
    }, 5000);
    return () => clearInterval(t);
  }, [canva]);
  const sections = data.sections as Section[] | undefined,
    slides = data.slides as Slide[] | undefined,
    journals = data.journals as Record<string, string>[] | undefined,
    criteria = data.criteria as
      | {
          name: string;
          weight: number;
          score: number;
          evidence: string;
          reason: string;
          suggestion: string;
        }[]
      | undefined;
  const changeSection = (index: number, key: keyof Section, value: string) =>
    setData({
      ...data,
      sections: sections!.map((s, i) =>
        i === index ? { ...s, [key]: value } : s,
      ),
    });
  const changeSlide = (
    index: number,
    key: keyof Slide,
    value: string | string[],
  ) =>
    setData({
      ...data,
      slides: slides!.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    });
  async function canvaAction(type: string) {
    try {
      setError("");
      const r = await api<{ job: { id: string; status: string } }>(
        `/api/integrations/canva/${type}`,
        {
          method: "POST",
          body: JSON.stringify({
            itemId: item.id,
            designId: canva?.designId,
            format: "pptx",
          }),
        },
      );
      setCanva({
        ...canva,
        id: r.job.id,
        status: r.job.status,
        type: type === "export" ? "export" : "import",
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="result-editor">
      <div className="editor-toolbar">
        <span className="save-status">
          <Icon
            name={saved === "Tersimpan" ? "CloudCheck" : "CloudUpload"}
            size={15}
          />
          {saved}
        </span>
        <div className="toolbar-actions">
          <CopyButton text={textFromData(data)} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            <Icon name={editing ? "Eye" : "Pencil"} size={15} />
            {editing ? "Pratinjau" : "Edit"}
          </Button>
          <select
            aria-label="Ekspor dokumen"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                const link = document.createElement("a");
                link.href = `/api/workspace/export/${item.id}?format=${e.target.value}`;
                link.download = `holyai.${e.target.value}`;
                link.click();
              }
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Ekspor
            </option>
            {[
              "txt",
              "docx",
              "pdf",
              ...(slides ? ["pptx"] : []),
              ...(journals || criteria ? ["xlsx"] : []),
              ...(item.kind === "book-creator" ? ["epub"] : []),
            ].map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <Alert error>{error}</Alert>}
      <input
        className="editor-title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setData({ ...data, title: e.target.value });
        }}
        aria-label="Judul dokumen"
      />
      {!!data.summary && (
        <p className="result-summary">{String(data.summary)}</p>
      )}
      {Array.isArray(data.warnings) && data.warnings.length > 0 && (
        <Alert>{(data.warnings as string[]).join(" ")}</Alert>
      )}
      {sections && (
        <div
          className={`document-layout ${item.kind === "paraphrase" ? "writing-result" : ""}`}
        >
          <nav className="document-outline" aria-label="Bagian dokumen">
            {sections.map((s, i) => (
              <button
                className={active === i ? "selected" : ""}
                key={i}
                onClick={() => setActive(i)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {s.heading}
              </button>
            ))}
          </nav>
          <article className="document-page">
            {editing ? (
              <>
                <Field label="Judul bagian">
                  <input
                    value={sections[active]?.heading || ""}
                    onChange={(e) =>
                      changeSection(active, "heading", e.target.value)
                    }
                  />
                </Field>
                <Field label="Isi (Markdown)">
                  <textarea
                    className="long-editor"
                    value={sections[active]?.body || ""}
                    onChange={(e) =>
                      changeSection(active, "body", e.target.value)
                    }
                  />
                </Field>
              </>
            ) : (
              <>
                <h2>{sections[active]?.heading}</h2>
                <div className="prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {sections[active]?.body || ""}
                  </ReactMarkdown>
                </div>
              </>
            )}
          </article>
        </div>
      )}
      {slides && (
        <div className="slides-layout">
          <nav className="slide-navigator">
            {slides.map((s, i) => (
              <button
                key={i}
                className={active === i ? "selected" : ""}
                onClick={() => setActive(i)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <b>{s.title}</b>
                <small>{s.bullets[0]}</small>
              </button>
            ))}
          </nav>
          <div>
            <div className="slide-preview">
              <span className="eyebrow">HOLYAI PRESENTATION</span>
              {editing ? (
                <>
                  <input
                    value={slides[active].title}
                    onChange={(e) =>
                      changeSlide(active, "title", e.target.value)
                    }
                  />
                  <textarea
                    value={slides[active].bullets.join("\n")}
                    onChange={(e) =>
                      changeSlide(active, "bullets", e.target.value.split("\n"))
                    }
                  />
                </>
              ) : (
                <>
                  <h2>{slides[active]?.title}</h2>
                  <ul>
                    {slides[active]?.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </>
              )}
              <small>
                {active + 1} / {slides.length}
              </small>
            </div>
            <Field label="Speaker notes">
              <textarea
                value={slides[active]?.notes || ""}
                onChange={(e) => changeSlide(active, "notes", e.target.value)}
              />
            </Field>
            <small>Saran visual: {slides[active]?.visual}</small>
            <div className="canva-actions">
              <Button
                variant="secondary"
                onClick={() => void canvaAction("import")}
              >
                <Icon name="ExternalLink" size={16} />
                Impor PPTX ke Canva
              </Button>
              {canva && <span className="badge">Canva: {canva.status}</span>}
              {canva?.editUrl && (
                <a
                  className="btn btn-secondary"
                  href={canva.editUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Edit di Canva
                </a>
              )}
              {canva?.designId && (
                <Button
                  variant="secondary"
                  onClick={() => void canvaAction("export")}
                >
                  Ekspor Canva
                </Button>
              )}
              {canva?.urls?.map((u, i) => (
                <a href={u} target="_blank" rel="noreferrer" key={i}>
                  Unduh Canva PPTX
                </a>
              ))}
            </div>
            <small>
              Hubungkan Canva di Pengaturan. Impor dan ekspor mengikuti izin
              akun. PPTX internal selalu tersedia setelah dokumen tersimpan.
            </small>
          </div>
        </div>
      )}
      {journals && (
        <>
          <div className="flex-between">
            <input
              value={filter}
              placeholder="Filter jurnal…"
              onChange={(e) => setFilter(e.target.value)}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setData({
                  ...data,
                  journals: [...journals].sort((a, b) =>
                    a.title.localeCompare(b.title),
                  ),
                })
              }
            >
              Urutkan judul
            </Button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {Object.keys(journals[0] || {}).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {journals.map(
                  (j, i) =>
                    JSON.stringify(j)
                      .toLowerCase()
                      .includes(filter.toLowerCase()) && (
                      <tr key={i}>
                        {Object.entries(j).map(([k, v]) => (
                          <td key={k}>
                            {editing ? (
                              <textarea
                                aria-label={`${k} jurnal ${i + 1}`}
                                value={v}
                                onChange={(e) =>
                                  setData({
                                    ...data,
                                    journals: journals.map((j, n) =>
                                      n === i
                                        ? { ...j, [k]: e.target.value }
                                        : j,
                                    ),
                                  })
                                }
                              />
                            ) : (
                              v
                            )}
                          </td>
                        ))}
                      </tr>
                    ),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {criteria && (
        <>
          <div className="rubric-total">
            <b>
              {Math.round(
                criteria.reduce((s, c) => s + (c.score * c.weight) / 100, 0),
              )}
              <span>/100</span>
            </b>
            <p>Perkiraan berdasarkan rubrik · bukan jaminan nilai pengajar</p>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Kriteria / bobot</th>
                  <th>Skor</th>
                  <th>Bukti & alasan</th>
                  <th>Perbaikan</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <b>{c.name}</b>
                      <small>{c.weight}%</small>
                    </td>
                    <td>{c.score}/100</td>
                    <td>
                      {c.evidence}
                      <p>{c.reason}</p>
                    </td>
                    <td>{c.suggestion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {typeof data.question === "string" && (
        <div className="defense-result">
          <span className="eyebrow">PERTANYAAN PENGUJI</span>
          <h2>{data.question}</h2>
          {typeof data.feedback === "string" && <p>{data.feedback}</p>}
          {Array.isArray(data.scores) && (
            <div className="score-grid">
              {(
                data.scores as {
                  criterion: string;
                  score: number;
                  reason: string;
                }[]
              ).map((s) => (
                <div className="panel" key={s.criterion}>
                  <b>{s.score}/10</b>
                  <h3>{s.criterion}</h3>
                  <p>{s.reason}</p>
                </div>
              ))}
            </div>
          )}
          {typeof data.strongerAnswer === "string" && data.strongerAnswer && (
            <Alert>{data.strongerAnswer}</Alert>
          )}
        </div>
      )}
      {Array.isArray(data.jobs) && (
        <div className="career-results">
          {(
            data.jobs as {
              slug: string;
              title: string;
              company_name: string;
              location: string;
              url: string;
              score: number;
              reason: string;
              gaps: string[];
              eligibility: string;
            }[]
          ).map((j) => (
            <article className="panel" key={j.slug}>
              <div className="flex-between">
                <span className="badge">{j.score}% kecocokan keterampilan</span>
                <a
                  href={j.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  Lowongan asli <Icon name="ArrowUpRight" size={15} />
                </a>
              </div>
              <h3>{j.title}</h3>
              <small>
                {j.company_name} · {j.location}
              </small>
              <p>{j.reason}</p>
              <p>Skill gap: {j.gaps.join(", ") || "Tidak disebutkan"}</p>
              <small>{j.eligibility}</small>
            </article>
          ))}
        </div>
      )}
      {Array.isArray(data.sources) && (
        <div className="sources-panel">
          <h3>Sumber penelitian</h3>
          <p>
            Indikator relevansi berasal dari penyedia pencarian; kredibilitas
            perlu ditinjau.
          </p>
          {(
            data.sources as {
              title: string;
              url: string;
              content: string;
              domain: string;
            }[]
          ).map((s, i) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
              <span>{i + 1}</span>
              <div>
                <b>{s.title}</b>
                <small>{s.domain}</small>
              </div>
              <Icon name="ArrowUpRight" size={16} />
            </a>
          ))}
        </div>
      )}
      <div className="editor-bottom">
        <Field label="Simpan ke proyek">
          <select
            value={projectId}
            onChange={async (e) => {
              const selected = e.target.value;
              setProjectId(selected);
              try {
                const result = await api<Item>(`items/${item.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({
                    title,
                    data,
                    projectId: selected || null,
                  }),
                });
                onChange?.(result);
                setSaved("Tersimpan");
              } catch (e) {
                setProjectId(item.projectId || "");
                setError((e as Error).message);
              }
            }}
          >
            <ProjectOptions />
          </select>
        </Field>
        {item.versions && item.versions.length > 0 && (
          <Field label="Riwayat versi">
            <select
              defaultValue=""
              onChange={(e) => {
                const version = item.versions?.find(
                  (v) => v.id === e.target.value,
                );
                if (version) {
                  setData(version.data);
                  setActive(0);
                }
                e.target.value = "";
              }}
            >
              <option value="">Pulihkan versi…</option>
              {item.versions.map((v) => (
                <option value={v.id} key={v.id}>
                  {new Date(v.createdAt).toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </div>
  );
}
function ProjectOptions() {
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    api<typeof projects>("projects")
      .then(setProjects)
      .catch(() => {});
  }, []);
  return (
    <>
      <option value="">Tanpa proyek</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title}
        </option>
      ))}
    </>
  );
}
