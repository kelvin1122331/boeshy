"use client";
import { useState } from "react";
import Link from "next/link";
import { api, useAPI, type Item, type GenerationJob } from "@/hooks/use-api";
import {
  PageHeader,
  Icon,
  Modal,
  Field,
  Alert,
  Empty,
  Spinner,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { features } from "@/config/features";
import { FileUpload } from "@/components/common/file-upload";
import { JobStatus } from "@/components/generator/job-status";
type Project = {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
  items?: Item[];
  files?: { id: string; name: string }[];
  conversations?: { id: string; title: string }[];
};
export function Projects({ projectId }: { projectId?: string }) {
  const { data: projects, error, reload } = useAPI<Project[]>("projects");
  const { data: project } = useAPI<Project>(
    projectId ? `projects/${projectId}` : null,
  );
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [message, setMessage] = useState("");
  return (
    <div>
      <PageHeader
        eyebrow="Your Workspace"
        title={project?.title || "Proyek saya"}
        description={
          project?.description ||
          "Satukan percakapan, dokumen, dan riset dalam satu arah."
        }
      >
        <Modal
          title="Buat proyek baru"
          trigger={
            <Button>
              <Icon name="FolderPlus" size={17} />
              Proyek baru
            </Button>
          }
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("projects", {
                  method: "POST",
                  body: JSON.stringify({ title, description }),
                });
                setTitle("");
                setDescription("");
                setMessage("Proyek tersimpan.");
                await reload();
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            <Field label="Nama proyek">
              <input
                value={title}
                required
                maxLength={100}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Tujuan proyek">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            {message && <Alert>{message}</Alert>}
            <Button>Simpan proyek</Button>
          </form>
        </Modal>
      </PageHeader>
      {error && <Alert error>{error}</Alert>}
      {projectId ? (
        <>
          <div className="panel">
            <h2>Hasil dalam proyek</h2>
            {project?.items?.length ? (
              <div className="activity-list" style={{ marginTop: 18 }}>
                {project.items.map((i) => (
                  <Link key={i.id} href={`/${i.kind}?item=${i.id}`}>
                    <Icon
                      name={
                        features.find((f) => f.id === i.kind)?.icon ||
                        "FileText"
                      }
                    />
                    <b>{i.title}</b>
                    <Icon name="ArrowUpRight" size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                icon="Files"
                title="Mulai menyusun proyekmu"
                description="Buka hasil dari fitur apa pun, lalu pilih proyek ini di bagian bawah editor."
              />
            )}
          </div>
          {project?.conversations?.map((c) => (
            <Link className="panel" href={`/chat/${c.id}`} key={c.id}>
              {c.title}
            </Link>
          ))}
        </>
      ) : projects?.length ? (
        <div className="project-grid">
          {projects.map((p) => (
            <article className="panel project-card" key={p.id}>
              <span className="tool-icon blue">
                <Icon name="Folder" />
              </span>
              <h2>
                <Link href={`/projects/${p.id}`}>{p.title}</Link>
              </h2>
              <p>
                {p.description || "Ruang untuk gagasan yang saling terhubung."}
              </p>
              <div className="flex-between">
                <small>
                  {new Date(p.updatedAt).toLocaleDateString("id-ID")}
                </small>
                <Link href={`/projects/${p.id}`} className="text-link">
                  Buka proyek <Icon name="ArrowUpRight" size={15} />
                </Link>
                <button
                  aria-label={`Hapus ${p.title}`}
                  onClick={async () => {
                    await api(`projects/${p.id}`, { method: "DELETE" });
                    await reload();
                  }}
                >
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            icon="Folders"
            title="Satu ruang, satu tujuan"
            description="Buat proyek untuk mengelompokkan hasil penelitian, karya, dan dokumenmu."
          />
        </div>
      )}
      <section style={{ marginTop: 35 }}>
        <div className="section-heading">
          <h2>Perpustakaan file</h2>
          <Modal
            title="Unggah ke perpustakaan"
            trigger={
              <Button variant="secondary">
                <Icon name="Upload" size={16} />
                Unggah file
              </Button>
            }
          >
            <FileUpload
              files={[]}
              onChange={() => {
                window.dispatchEvent(new Event("files-updated"));
              }}
            />
          </Modal>
        </div>
        <FileLibrary />
      </section>
    </div>
  );
}
function FileLibrary() {
  const {
    data: files,
    error,
    reload,
  } = useAPI<
    { id: string; name: string; size: number; warning: string | null }[]
  >("files", 15000);
  const [message, setMessage] = useState("");
  return (
    <div className="panel">
      {error && <Alert error>{error}</Alert>}
      {message && <Alert error>{message}</Alert>}
      {files?.length ? (
        <div className="activity-list">
          {files.map((f) => (
            <div className="task-row" key={f.id}>
              <Icon name="FileText" />
              <div className="task-main">
                <h3>{f.name}</h3>
                <small>
                  {(f.size / 1024).toFixed(1)} KB
                  {f.warning && " · " + f.warning}
                </small>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Unduh ${f.name}`}
                onClick={async () => {
                  try {
                    const r = await api<{ url: string }>(`files/${f.id}`);
                    window.open(r.url, "_blank", "noopener");
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                <Icon name="Download" size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Hapus ${f.name}`}
                onClick={async () => {
                  try {
                    await api(`files/${f.id}`, { method: "DELETE" });
                    await reload();
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                <Icon name="Trash2" size={16} />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          icon="Upload"
          title="Bahan untuk gagasan berikutnya"
          description="File yang kamu unggah akan tersedia di sini. Penyimpanan S3 harus dikonfigurasi untuk mengunggah."
        />
      )}
    </div>
  );
}
export function History() {
  const [query, setQuery] = useState("");
  const { data: items, error } = useAPI<Item[]>(
    `history?q=${encodeURIComponent(query)}`,
  );
  const { data: jobs } = useAPI<GenerationJob[]>("jobs", 15000);
  const { data: chats } = useAPI<{ id: string; title: string }[]>("/api/chat");
  const { data: exams } = useAPI<{ id: string; title: string }[]>("exams");
  return (
    <div>
      <PageHeader
        eyebrow="Your Workspace"
        title="Setiap langkah, tersimpan."
        description="Lanjutkan pekerjaanmu dari tempat terakhir kamu berhenti."
      />
      <input
        aria-label="Cari riwayat"
        placeholder="Cari hasil berdasarkan judul…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 22, maxWidth: 420 }}
      />
      {error && <Alert error>{error}</Alert>}
      <div className="panel">
        {items?.length ? (
          <div className="activity-list">
            {items.map((i) => (
              <Link
                key={i.id}
                href={
                  i.kind === "study-exam"
                    ? `/study-exam/${i.data.id}`
                    : `/${i.kind}?item=${i.id}`
                }
              >
                <span className="activity-icon">
                  <Icon
                    name={
                      features.find((f) => f.id === i.kind)?.icon || "FileText"
                    }
                  />
                </span>
                <span>
                  <b>{i.title}</b>
                  <small>{features.find((f) => f.id === i.kind)?.name}</small>
                </span>
                <time>{new Date(i.updatedAt).toLocaleDateString("id-ID")}</time>
                <Icon name="ArrowUpRight" size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            icon="History"
            title="Perjalananmu dimulai di sini"
            description="Hasil tersimpan akan muncul setelah kamu menyelesaikan pekerjaan pertama."
          />
        )}
      </div>
      {chats && chats.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <h2>Percakapan</h2>
          <div className="activity-list" style={{ marginTop: 15 }}>
            {chats
              .filter((c) =>
                c.title.toLowerCase().includes(query.toLowerCase()),
              )
              .map((c) => (
                <Link key={c.id} href={`/chat/${c.id}`}>
                  <Icon name="MessageSquare" />
                  <b>{c.title}</b>
                </Link>
              ))}
          </div>
        </section>
      )}
      {exams && exams.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <h2>Ujian tersimpan</h2>
          <div className="activity-list" style={{ marginTop: 15 }}>
            {exams.map((e) => (
              <Link key={e.id} href={`/study-exam/${e.id}`}>
                <Icon name="Brain" />
                <b>{e.title}</b>
              </Link>
            ))}
          </div>
        </section>
      )}
      {jobs && jobs.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <h2>Antrean & generasi</h2>
          <div className="stack" style={{ marginTop: 15 }}>
            {jobs.map((j) => (
              <Link href={`/${j.kind}?job=${j.id}`} key={j.id}>
                <JobStatus job={j} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
export function Notifications() {
  const { data, error, loading, reload } = useAPI<
    {
      id: string;
      title: string;
      href: string;
      read: boolean;
      createdAt: string;
    }[]
  >("notifications", 15000);
  return (
    <div>
      <PageHeader
        eyebrow="Your Workspace"
        title="Kabar dari workspace-mu."
        description="Hasil yang selesai dan hal yang perlu kamu perhatikan."
      >
        <Button
          variant="secondary"
          onClick={async () => {
            await api("notifications", { method: "PATCH", body: "{}" });
            await reload();
          }}
        >
          Tandai semua dibaca
        </Button>
      </PageHeader>
      {error && <Alert error>{error}</Alert>}
      <div className="panel">
        {loading ? (
          <Spinner />
        ) : data?.length ? (
          data.map((n) => (
            <div
              className={`notification-row ${!n.read ? "unread" : ""}`}
              key={n.id}
            >
              <span className="activity-icon">
                <Icon name="Bell" />
              </span>
              <div>
                <Link
                  href={n.href}
                  onClick={() =>
                    void api(`notifications/${n.id}`, {
                      method: "PATCH",
                      body: "{}",
                    })
                  }
                >
                  <b>{n.title}</b>
                </Link>
                <small>{new Date(n.createdAt).toLocaleString("id-ID")}</small>
              </div>
              {!n.read && <span className="status-dot" />}
              <Icon name="ChevronRight" size={16} />
            </div>
          ))
        ) : (
          <Empty
            icon="Bell"
            title="Semua tenang di sini"
            description="Notifikasi akan muncul dari pekerjaan nyata yang selesai dan tugas yang mendekati tenggat."
          />
        )}
      </div>
    </div>
  );
}
