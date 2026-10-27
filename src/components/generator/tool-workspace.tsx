"use client";
import { useState, useEffect } from "react";
import NextImage from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { findFeature, type FeatureId } from "@/config/features";
import { featureFields } from "@/features/forms";
import {
  api,
  useAPI,
  type Capabilities,
  type GenerationJob,
  type Item,
} from "@/hooks/use-api";
import { PageHeader, Icon, Field, Alert, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { FileUpload, type Upload } from "@/components/common/file-upload";
import { JobStatus } from "./job-status";
import { ResultEditor } from "@/components/documents/result-editor";
export function ToolWorkspace({ id }: { id: FeatureId }) {
  const f = findFeature(id)!;
  const params = useSearchParams(),
    router = useRouter();
  const [prompt, setPrompt] = useState(params.get("prompt") || ""),
    [files, setFiles] = useState<Upload[]>([]),
    [options, setOptions] = useState<Record<string, string | number | boolean>>(
      () =>
        Object.fromEntries(
          (featureFields[id] || []).map((o) => [
            o.key,
            o.default ?? o.values?.[0] ?? "",
          ]),
        ),
    ),
    [jobId, setJobId] = useState<string | null>(params.get("job")),
    [item, setItem] = useState<Item | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [asset, setAsset] = useState<string>("");
  const { data: caps } = useAPI<Capabilities>("capabilities");
  const { data: history, reload: reloadHistory } = useAPI<GenerationJob[]>(
    `jobs?kind=${id}`,
    15000,
  );
  const { data: job } = useAPI<GenerationJob>(
    jobId ? `jobs/${jobId}` : null,
    jobId ? 3000 : 0,
  );
  const visual = id === "image-generator" || id === "video-generator";
  const isDocument = [
    "presentation-studio",
    "book-creator",
    "academic-document",
  ].includes(id);
  const available = caps?.featureStatus?.[id]?.ready ?? !!caps?.[f.capability];
  useEffect(() => {
    const itemId = params.get("item");
    if (itemId)
      api<Item>(`items/${itemId}`)
        .then(setItem)
        .catch((e) => setError(e.message));
  }, [params]);
  useEffect(() => {
    if (!job) return;
    if (job.status === "completed") {
      if (job.kind === "study-exam" && job.result?.id)
        router.push(`/study-exam/${job.result.id}`);
      if (job.itemId)
        api<Item>(`items/${job.itemId}`)
          .then(setItem)
          .catch((e) => setError(e.message));
      if (job.assets?.[0])
        api<{ url: string }>(`assets/${job.assets[0].id}`)
          .then((r) => setAsset(r.url))
          .catch((e) => setError(e.message));
    }
  }, [job, router]);
  async function generate(stage = "outline") {
    setError("");
    setBusy(true);
    try {
      if (id === "rubric-checker" && !String(options.rubric || "").trim())
        throw new Error("Tambahkan rubrik penilaian.");
      if (id === "journal-matrix" && files.length < 2)
        throw new Error("Tambahkan 2–20 file jurnal.");
      const input = {
        prompt:
          stage === "draft" && item
            ? `${prompt}\n\nOutline disetujui:\n${JSON.stringify(item.data)}`
            : id === "defense-simulator" && item
              ? `${prompt}\n\nRiwayat sesi: ${JSON.stringify(item.data)}`
              : prompt,
        fileIds: files.map((f) => f.id),
        options: { ...options, stage },
      };
      const created = await api<GenerationJob>(`jobs/${id}`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      setJobId(created.id);
      setAsset("");
      await reloadHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const pending = job && ["queued", "processing"].includes(job.status);
  return (
    <div className={`feature-workspace feature-${id}`}>
      <PageHeader
        eyebrow={f.category}
        title={f.name}
        description={f.description}
      >
        <Link href="/history" className="btn btn-secondary">
          <Icon name="History" size={16} />
          Riwayat
        </Link>
      </PageHeader>
      {caps && !available && (
        <Alert>
          AI provider belum dikonfigurasi. Hubungi administrator.{" "}
          {caps.canConfigureProviders && (
            <Link href="/admin/ai-providers">Configure Provider →</Link>
          )}
        </Alert>
      )}
      {id === "originality-checker" && (
        <Alert>
          Tinjauan ini memeriksa sitasi, pengulangan, dan kualitas tulisan.
          Database pembanding plagiarisme belum terhubung; persentase
          plagiarisme tidak tersedia.
        </Alert>
      )}
      <div
        className={`studio-layout ${visual ? "visual-studio" : ""} ${id === "notes-summarizer" || id === "paraphrase" ? "split-studio" : ""}`}
      >
        <section className="panel studio-input">
          <div className="panel-heading">
            <span className={`tool-icon ${f.color}`}>
              <Icon name={f.icon} />
            </span>
            <div>
              <h2>
                {visual
                  ? "Arahkan imajinasimu"
                  : id === "study-exam"
                    ? "Materi & konfigurasi ujian"
                    : isDocument
                      ? "Mulai dari brief yang jelas"
                      : "Materi & instruksi"}
              </h2>
              <small>
                {isDocument
                  ? "Outline → Tinjau → Kembangkan → Ekspor"
                  : "Hasil mengikuti materi dan pengaturanmu."}
              </small>
            </div>
          </div>
          <Field
            label={
              visual
                ? "Prompt"
                : id === "paraphrase"
                  ? "Tulisan asli"
                  : "Apa yang ingin kamu kerjakan?"
            }
          >
            <textarea
              className={
                id === "paraphrase" || id === "notes-summarizer"
                  ? "material-input"
                  : "prompt-input"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={f.hint}
            />
          </Field>
          {!visual && <FileUpload files={files} onChange={setFiles} />}
          <div className="options-grid">
            {(featureFields[id] || []).map((o) => (
              <Field key={o.key} label={o.label} hint={o.hint}>
                {o.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={!!options[o.key]}
                    onChange={(e) =>
                      setOptions({ ...options, [o.key]: e.target.checked })
                    }
                  />
                ) : o.type === "textarea" ? (
                  <textarea
                    value={String(options[o.key] || "")}
                    onChange={(e) =>
                      setOptions({ ...options, [o.key]: e.target.value })
                    }
                  />
                ) : o.values ? (
                  <select
                    value={String(options[o.key])}
                    onChange={(e) =>
                      setOptions({ ...options, [o.key]: e.target.value })
                    }
                  >
                    {o.values.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={o.type || "text"}
                    value={String(options[o.key] ?? "")}
                    min={o.min}
                    max={o.max}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        [o.key]:
                          o.type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                )}
              </Field>
            ))}
          </div>
          {visual && (
            <small className="capability-note">
              {id === "image-generator"
                ? "Editing, image-to-image, negative prompt, dan rasio lain belum didukung adapter ini."
                : "Image-to-video dan pembatalan selama proses belum didukung adapter ini."}
            </small>
          )}
          {error && <Alert error>{error}</Alert>}
          <Button
            className="generate-button"
            disabled={
              busy ||
              !!pending ||
              !available ||
              (!prompt.trim() && !files.length)
            }
            onClick={() => void generate()}
          >
            <Icon name={id === "study-exam" ? "Brain" : "Sparkles"} size={18} />
            {busy || pending
              ? "Sedang diproses…"
              : isDocument
                ? "Susun outline"
                : id === "defense-simulator" && item
                  ? "Evaluasi & lanjutkan"
                  : id === "study-exam"
                    ? "Buat ujian"
                    : "Mulai proses"}
          </Button>
          {isDocument && item && (
            <Button
              variant="secondary"
              disabled={!!pending || !available}
              onClick={() => void generate("draft")}
            >
              Setujui outline & kembangkan draft{" "}
              <Icon name="ArrowRight" size={16} />
            </Button>
          )}
          <small className="privacy-note">
            <Icon name="LockKeyhole" size={12} />
            File dan hasil hanya tersedia untuk akunmu.
          </small>
        </section>
        <section
          className={`panel studio-output ${visual ? "canvas-panel" : ""}`}
        >
          <div className="panel-heading">
            <h2>
              {visual
                ? "Canvas"
                : id === "study-exam"
                  ? "Ujianmu"
                  : isDocument
                    ? "Ruang editor"
                    : id === "journal-matrix"
                      ? "Matriks perbandingan"
                      : id === "paraphrase"
                        ? "Hasil perbaikan"
                        : "Hasil & insight"}
            </h2>
            <span className="badge">
              {item ? "Tersimpan" : asset ? "File tersedia" : "Workspace"}
            </span>
          </div>
          {job && <JobStatus job={job} />}
          {asset ? (
            <div className="asset-preview">
              {id === "image-generator" ? (
                <NextImage
                  unoptimized
                  width={1024}
                  height={1024}
                  style={{ height: "auto" }}
                  src={asset}
                  alt={prompt || "Gambar hasil AI"}
                />
              ) : (
                <video src={asset} controls playsInline />
              )}
              <a
                className="btn btn-secondary"
                href={asset}
                target="_blank"
                rel="noreferrer"
                download
              >
                Unduh hasil <Icon name="Download" size={16} />
              </a>
            </div>
          ) : item ? (
            <ResultEditor item={item} key={item.id} />
          ) : (
            <Empty
              icon={f.icon}
              title={
                pending
                  ? "Memberi ruang untuk proses yang baik"
                  : "Dari idemu, menjadi sesuatu yang nyata"
              }
              description={
                pending
                  ? "Kamu bisa pindah halaman. Hasil tetap tersimpan dan status dapat dilihat di riwayat."
                  : visual
                    ? "Tulis prompt di sebelah kiri. File asli dari provider akan tampil di canvas ini."
                    : "Tambahkan instruksi dan materi untuk memulai. Hasil dapat ditinjau, diedit, dan diekspor."
              }
            />
          )}
        </section>
      </div>
      {history && history.length > 0 && (
        <section className="generation-history">
          <div className="section-heading">
            <h2>Pekerjaan sebelumnya</h2>
            <span className="badge">{history.length}</span>
          </div>
          <div className="job-history-grid">
            {history.map((j) => (
              <button
                className={`panel history-card ${j.id === jobId ? "selected" : ""}`}
                key={j.id}
                onClick={() => {
                  setJobId(j.id);
                  setItem(null);
                  setAsset("");
                }}
              >
                <div className="flex-between">
                  <Icon name={f.icon} />
                  <span className="badge">{j.status}</span>
                </div>
                <b>
                  {String(
                    j.result?.title || "Pekerjaan " + j.id.slice(0, 8),
                  ).slice(0, 100)}
                </b>
                <small>{new Date(j.createdAt).toLocaleString("id-ID")}</small>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
