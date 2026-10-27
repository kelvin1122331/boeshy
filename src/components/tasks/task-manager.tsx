"use client";
import { useState } from "react";
import { api, useAPI } from "@/hooks/use-api";
import {
  PageHeader,
  Icon,
  Field,
  Alert,
  Empty,
  Modal,
} from "@/components/common";
import { Button } from "@/components/ui/button";
type Task = {
  id: string;
  title: string;
  description: string;
  subject: string;
  priority: string;
  status: string;
  dueAt: string | null;
};
const statuses = {
  todo: "Akan dikerjakan",
  doing: "Sedang dikerjakan",
  done: "Selesai",
};
export function TaskManager() {
  const {
    data: tasks,
    setData: setTasks,
    error,
    reload,
  } = useAPI<Task[]>("tasks");
  const [view, setView] = useState("list"),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState(""),
    [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    );
  const filtered =
    tasks?.filter((t) =>
      (t.title + " " + t.subject).toLowerCase().includes(query.toLowerCase()),
    ) || [];
  async function update(id: string, data: Partial<Task>) {
    const before = tasks;
    setTasks(tasks?.map((t) => (t.id === id ? { ...t, ...data } : t)) || []);
    try {
      await api(`tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      await reload();
    } catch (e) {
      setTasks(before);
      setMessage((e as Error).message);
    }
  }
  const firstDay = (month.getDay() + 6) % 7,
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <div>
      <PageHeader
        eyebrow="Productivity & Career"
        title="Ruang untuk fokus."
        description="Susun langkah kecil, jaga yang penting, dan selesaikan dengan tenang."
      >
        <Modal
          title="Tambah tugas"
          trigger={
            <Button>
              <Icon name="Plus" size={17} />
              Tugas baru
            </Button>
          }
        >
          <TaskForm onSaved={reload} />
        </Modal>
      </PageHeader>
      <div className="stats-strip" style={{ marginBottom: 28 }}>
        {[
          {
            n: tasks?.filter((t) => t.status !== "done").length || 0,
            label: "Tugas aktif",
            icon: "ListTodo",
          },
          {
            n: tasks?.filter((t) => t.status === "done").length || 0,
            label: "Sudah selesai",
            icon: "CircleCheck",
          },
          {
            n:
              tasks?.filter((t) => t.priority === "high" && t.status !== "done")
                .length || 0,
            label: "Prioritas tinggi",
            icon: "Flag",
          },
          {
            n:
              tasks?.filter(
                (t) =>
                  t.dueAt &&
                  new Date(t.dueAt) < new Date() &&
                  t.status !== "done",
              ).length || 0,
            label: "Lewat tenggat",
            icon: "Clock3",
          },
        ].map((s) => (
          <div key={s.label}>
            <span className="stat-icon">
              <Icon name={s.icon} />
            </span>
            <div>
              <b>{s.n}</b>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="task-toolbar">
        <input
          aria-label="Cari tugas"
          placeholder="Cari tugas atau mata kuliah…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Modal
          title="Ekstrak instruksi tugas"
          trigger={
            <Button variant="secondary">
              <Icon name="Sparkles" size={16} />
              Ekstrak dengan AI
            </Button>
          }
        >
          <ExtractTasks reload={reload} />
        </Modal>
        <div className="view-toggle">
          {[
            { id: "list", label: "Daftar", icon: "List" },
            { id: "kanban", label: "Kanban", icon: "Columns3" },
            { id: "calendar", label: "Kalender", icon: "CalendarDays" },
          ].map((v) => (
            <button
              className={view === v.id ? "selected" : ""}
              key={v.id}
              onClick={() => setView(v.id)}
            >
              <Icon name={v.icon} size={14} />
              {v.label}
            </button>
          ))}
        </div>
      </div>
      {(error || message) && <Alert error>{error || message}</Alert>}
      {view === "list" && (
        <div className="panel">
          {filtered.length ? (
            filtered.map((t) => (
              <div
                className={`task-row ${t.status === "done" ? "task-done" : ""}`}
                key={t.id}
              >
                <input
                  type="checkbox"
                  aria-label={`Selesaikan ${t.title}`}
                  checked={t.status === "done"}
                  onChange={(e) =>
                    void update(t.id, {
                      status: e.target.checked ? "done" : "todo",
                    })
                  }
                />
                <div className="task-main">
                  <h3>{t.title}</h3>
                  <small>
                    {t.subject || "Tanpa kategori"}
                    {t.dueAt &&
                      ` · ${new Date(t.dueAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`}
                  </small>
                </div>
                <span className={`badge priority-${t.priority}`}>
                  {t.priority}
                </span>
                <Modal
                  title="Edit tugas"
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${t.title}`}
                    >
                      <Icon name="Pencil" size={15} />
                    </Button>
                  }
                >
                  <TaskForm task={t} onSaved={reload} />
                </Modal>
                <button
                  aria-label={`Hapus ${t.title}`}
                  onClick={async () => {
                    try {
                      await api(`tasks/${t.id}`, { method: "DELETE" });
                      await reload();
                    } catch (e) {
                      setMessage((e as Error).message);
                    }
                  }}
                >
                  <Icon name="Trash2" size={16} />
                </button>
              </div>
            ))
          ) : (
            <Empty
              icon="CheckSquare"
              title="Beri ruang untuk langkah berikutnya"
              description="Tambahkan tugas pertama dan tentukan prioritasmu."
            />
          )}
        </div>
      )}
      {view === "kanban" && (
        <div className="kanban">
          {Object.entries(statuses).map(([status, label]) => (
            <section className="kanban-column" key={status}>
              <h3>
                {label}
                <span className="badge">
                  {filtered.filter((t) => t.status === status).length}
                </span>
              </h3>
              {filtered
                .filter((t) => t.status === status)
                .map((t) => (
                  <article className="panel kanban-card" key={t.id}>
                    <span className={`badge priority-${t.priority}`}>
                      {t.priority}
                    </span>
                    <h3 style={{ marginTop: 10 }}>{t.title}</h3>
                    <small>
                      {t.subject}
                      {t.dueAt &&
                        ` · ${new Date(t.dueAt).toLocaleDateString("id-ID")}`}
                    </small>
                    <select
                      aria-label={`Status ${t.title}`}
                      value={t.status}
                      onChange={(e) =>
                        void update(t.id, { status: e.target.value })
                      }
                    >
                      {Object.entries(statuses).map(([id, label]) => (
                        <option value={id} key={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </article>
                ))}
            </section>
          ))}
        </div>
      )}
      {view === "calendar" && (
        <>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <Button
              variant="secondary"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              aria-label="Bulan sebelumnya"
            >
              <Icon name="ChevronLeft" size={17} />
            </Button>
            <h2>
              {month.toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button
              variant="secondary"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              aria-label="Bulan berikutnya"
            >
              <Icon name="ChevronRight" size={17} />
            </Button>
          </div>
          <div className="calendar-wrap">
            <div className="calendar">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
                <div className="calendar-label" key={d}>
                  {d}
                </div>
              ))}
              {Array.from(
                { length: Math.ceil((firstDay + days) / 7) * 7 },
                (_, i) => {
                  const day = i - firstDay + 1;
                  return (
                    <div className="calendar-day" key={i}>
                      {day > 0 && day <= days && (
                        <>
                          <span>{day}</span>
                          {filtered
                            .filter(
                              (t) =>
                                t.dueAt &&
                                new Date(t.dueAt).toDateString() ===
                                  new Date(
                                    month.getFullYear(),
                                    month.getMonth(),
                                    day,
                                  ).toDateString(),
                            )
                            .map((t) => (
                              <Modal
                                key={t.id}
                                title="Edit tugas"
                                trigger={<button>{t.title}</button>}
                              >
                                <TaskForm task={t} onSaved={reload} />
                              </Modal>
                            ))}
                        </>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </>
      )}
      <small style={{ display: "block", marginTop: 18 }}>
        Tenggat ditampilkan sesuai zona waktu perangkatmu. Pengingat diproses
        worker setiap menit dan muncul di Notifikasi.
      </small>
    </div>
  );
}
function TaskForm({
  task,
  onSaved,
}: {
  task?: Task;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(task?.title || ""),
    [description, setDescription] = useState(task?.description || ""),
    [subject, setSubject] = useState(task?.subject || ""),
    [priority, setPriority] = useState(task?.priority || "medium"),
    [status, setStatus] = useState(task?.status || "todo"),
    [dueAt, setDueAt] = useState(
      task?.dueAt
        ? new Date(
            new Date(task.dueAt).getTime() -
              new Date().getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "",
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api(task?.id ? `tasks/${task.id}` : "tasks", {
            method: task?.id ? "PATCH" : "POST",
            body: JSON.stringify({
              title,
              description,
              subject,
              priority,
              status,
              dueAt: dueAt ? new Date(dueAt).toISOString() : null,
            }),
          });
          setMessage("Tugas tersimpan.");
          await onSaved();
          if (!task) {
            setTitle("");
            setDescription("");
          }
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Judul tugas">
        <input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="Mata kuliah / kategori">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="Instruksi">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="options-grid">
        <Field label="Prioritas">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {["low", "medium", "high"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(statuses).map(([id, l]) => (
              <option value={id} key={id}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Tenggat (waktu perangkat)">
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
      </Field>
      {message && <Alert>{message}</Alert>}
      <Button disabled={busy}>Simpan tugas</Button>
    </form>
  );
}
function ExtractTasks({ reload }: { reload: () => Promise<void> }) {
  const [text, setText] = useState(""),
    [candidates, setCandidates] = useState<
      (Omit<Task, "id" | "status"> & { clarification: string })[]
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="stack">
      <Field label="Instruksi dari dosen / guru">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tempel instruksi tugas, termasuk tenggat jika ada…"
        />
      </Field>
      <Button
        disabled={busy || !text.trim()}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await api<{ tasks: typeof candidates }>("tasks/extract", {
              method: "POST",
              body: JSON.stringify({ text }),
            });
            setCandidates(r.tasks);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Analisis instruksi
      </Button>
      {error && <Alert error>{error}</Alert>}
      {candidates.map((t, i) => (
        <div className="panel" key={i}>
          <h3>{t.title}</h3>
          <p>{t.description}</p>
          {t.clarification && <Alert>{t.clarification}</Alert>}
          <TaskForm task={{ ...t, id: "", status: "todo" }} onSaved={reload} />
        </div>
      ))}
    </div>
  );
}
