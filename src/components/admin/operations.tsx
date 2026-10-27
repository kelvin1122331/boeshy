"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/common";
import type {
  overview,
  usageReport,
  infrastructure,
  deploymentStatus,
} from "@/server/admin/monitoring";
import { hasPermission } from "@/lib/permissions";
import {
  adminRequest,
  useAdminData,
  Metric,
  Status,
  Notice,
  EmptyState,
  Loading,
  Table,
  dateText,
  bytesText,
} from "./shared";
type Overview = Awaited<ReturnType<typeof overview>>;
type Usage = Awaited<ReturnType<typeof usageReport>>;
type Infrastructure = Awaited<ReturnType<typeof infrastructure>>;
type Deployment = Awaited<ReturnType<typeof deploymentStatus>>;
type Settings = {
  general: { name: string; supportEmail: string; timezone: string };
  limits: {
    monthlyLimit: number;
    rateLimit: number;
    monthlyBudget: number | null;
    maxConcurrentJobs: number;
  };
  notifications: { enabled: boolean; thresholdPercent: number };
  primary: Record<string, string>;
};
export function OverviewPage() {
  const { data, error, reload } = useAdminData<Overview>("overview");
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Loading />;
  const enabled = data.providers.filter((p) => p.enabled).length;
  const health = [
    { label: "Gemini AI", id: "gemini", href: "ai-providers" },
    {
      label: "Web Search",
      id: data.primary.search,
      href: "integrations/search",
    },
    {
      label: "Academic APIs",
      id: data.primary.academic,
      href: "integrations/academic",
    },
    { label: "Image AI", id: "openai", href: "integrations/image" },
    { label: "Video AI", id: "openai", href: "integrations/video" },
    { label: "Canva", id: "canva", href: "integrations/canva" },
    { label: "Google Services", id: "google", href: "integrations/google" },
    { label: "Job Search", id: data.primary.jobs, href: "integrations/jobs" },
  ];
  return (
    <>
      <div className="acc-toolbar">
        <div className="acc-environment">
          <i />
          Live database · no simulated usage
        </div>
        <button className="btn btn-secondary" onClick={() => void reload()}>
          <Icon name="RefreshCw" size={15} />
          Refresh
        </button>
      </div>
      <div className="acc-metrics">
        <Metric label="Total users" value={data.users} icon="Users" />
        <Metric
          label="Active users"
          value={data.activeUsers}
          icon="UserCheck"
          detail="Accounts with an unexpired session"
        />
        <Metric
          label="AI requests"
          value={data.requests}
          icon="Sparkles"
          detail={data.requests ? "Recorded attempts" : "No usage recorded"}
        />
        <Metric
          label="Successful requests"
          value={data.success}
          icon="CircleCheck"
        />
      </div>
      <div className="acc-overview-grid">
        <section className="acc-panel">
          <div className="acc-panel-heading">
            <div>
              <h2>System snapshot</h2>
              <p>Angka yang berasal dari database saat ini.</p>
            </div>
            <Icon name="Activity" />
          </div>
          <dl className="acc-definition-list">
            <div>
              <dt>Failed requests</dt>
              <dd>{data.failed}</dd>
            </div>
            <div>
              <dt>Enabled providers</dt>
              <dd>{enabled}</dd>
            </div>
            <div>
              <dt>Disabled providers</dt>
              <dd>{data.providers.length - enabled}</dd>
            </div>
            <div>
              <dt>Verified connections</dt>
              <dd>
                {data.providers.filter((p) => p.status === "connected").length}
              </dd>
            </div>
            <div>
              <dt>Recorded upload storage</dt>
              <dd>{bytesText(data.storageBytes)}</dd>
            </div>
            <div>
              <dt>Estimated API cost</dt>
              <dd>
                {data.estimatedCost === null
                  ? "Not available"
                  : `USD ${data.estimatedCost.toFixed(4)}`}
              </dd>
            </div>
          </dl>
          <small className="acc-muted">
            Ukuran aset generasi belum dihitung dalam jumlah byte unggahan.
            Estimasi biaya hanya memakai tarif model yang dikonfigurasi.
          </small>
        </section>
        <section className="acc-panel">
          <div className="acc-panel-heading">
            <div>
              <h2>Background jobs</h2>
              <p>Status pekerjaan yang tersimpan.</p>
            </div>
            <Link href="/admin/jobs">
              View jobs <Icon name="ArrowRight" size={14} />
            </Link>
          </div>
          {data.jobs.length ? (
            <div className="acc-job-summary">
              {data.jobs.map((job) => (
                <div key={job.status}>
                  <Status value={job.status} />
                  <strong>{job._count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No jobs recorded"
              description="Antrean akan muncul setelah fitur benar-benar dijalankan."
            />
          )}
        </section>
      </div>
      <section>
        <div className="acc-panel-heading">
          <div>
            <h2>Integration health</h2>
            <p>
              Status konfigurasi dan pemeriksaan aktual. Tidak ada tes provider
              otomatis.
            </p>
          </div>
          <Link href="/admin/api-credentials">
            Manage credentials <Icon name="ArrowRight" size={14} />
          </Link>
        </div>
        <div className="acc-health-grid">
          {health.map((card) => {
            const provider = data.providers.find((p) => p.id === card.id);
            return (
              <Link
                href={`/admin/${card.href}`}
                className="acc-health-card"
                key={card.label}
              >
                <Icon
                  name={
                    card.id === "gemini"
                      ? "Sparkles"
                      : card.id === "crossref"
                        ? "GraduationCap"
                        : "Plug"
                  }
                  size={21}
                />
                <strong>{card.label}</strong>
                <Status value={provider?.status || "not_configured"} />
                <small>
                  {provider?.checkedAt
                    ? dateText(provider.checkedAt)
                    : "Belum diverifikasi"}
                </small>
              </Link>
            );
          })}
          <Link href="/admin/database" className="acc-health-card">
            <Icon name="Database" size={21} />
            <strong>Database</strong>
            <Status value={data.database.status} />
            <small>{data.database.engine} · data berhasil dibaca</small>
          </Link>
        </div>
      </section>
      {!data.encryptionReady && (
        <Notice error>
          Kunci enkripsi server belum tersedia. Atur CREDENTIAL_ENCRYPTION_KEY
          melalui konfigurasi deployment sebelum menyimpan secret.
        </Notice>
      )}
      <section className="acc-get-started">
        <span>
          <Icon name="KeyRound" size={22} />
        </span>
        <div>
          <h2>Siapkan provider pertama saat kamu sudah siap.</h2>
          <p>
            Configure → simpan → test connection → daftarkan model → pilih fitur
            → enable.
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin/ai-providers">
          Configure Provider <Icon name="ArrowRight" size={16} />
        </Link>
      </section>
    </>
  );
}
export function UsagePage({ role }: { role: string }) {
  const [period, setPeriod] = useState("7"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [clock] = useState(() => Date.now());
  const start = new Date(
    clock - (period === "today" ? 0 : Number(period || 7) - 1) * 86400000,
  );
  start.setUTCHours(0, 0, 0, 0);
  const query =
    period === "custom" && from && to
      ? `from=${encodeURIComponent(from + "T00:00:00.000Z")}&to=${encodeURIComponent(to + "T23:59:59.999Z")}`
      : `from=${encodeURIComponent(start.toISOString())}`;
  const { data, error } = useAdminData<Usage>(`usage?${query}`);
  if (error) return <Notice error>{error}</Notice>;
  return (
    <>
      <div className="acc-toolbar">
        <label className="acc-inline-label">
          Range
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        {period === "custom" && (
          <div className="acc-date-range">
            <label>
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="acc-panel">
            <div className="acc-panel-heading">
              <div>
                <h2>Recorded requests</h2>
                <p>
                  {dateText(data.from)} – {dateText(data.to)}
                </p>
              </div>
            </div>
            {data.days.length ? (
              <div className="acc-usage-chart" aria-label="Requests by day">
                {data.days.map((day) => (
                  <div key={day.date}>
                    <strong>{day.requests}</strong>
                    <span
                      style={{
                        height: `${Math.max(4, (day.requests / Math.max(...data.days.map((d) => d.requests))) * 110)}px`,
                      }}
                    />
                    <small>{day.date.slice(5)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No usage recorded"
                description="Token, latency, dan biaya akan muncul setelah permintaan nyata tercatat."
              />
            )}
            {data.chartLimited && (
              <Notice>
                Grafik menampilkan hingga 10.000 catatan terbaru. Tabel agregat
                memakai seluruh rentang tanggal.
              </Notice>
            )}
          </div>
          <section className="acc-panel">
            <h2>Requests per feature & provider</h2>
            {data.byFeature.length ? (
              <Table
                headings={[
                  "Feature",
                  "Provider",
                  "Status",
                  "Requests",
                  "Input / output tokens",
                  "Latency",
                  "Estimated cost",
                ]}
              >
                {data.byFeature.map((row, index) => (
                  <tr key={index}>
                    <td>{row.feature}</td>
                    <td>{row.provider}</td>
                    <td>
                      <Status value={row.status} />
                    </td>
                    <td>{row._count}</td>
                    <td>
                      {row._sum.inputTokens ?? 0} / {row._sum.outputTokens ?? 0}
                    </td>
                    <td>
                      {row._avg.latencyMs === null
                        ? "Unavailable"
                        : `${Math.round(row._avg.latencyMs)} ms`}
                    </td>
                    <td>
                      {row._sum.estimatedCost === null
                        ? "Not available"
                        : `USD ${row._sum.estimatedCost.toFixed(4)}`}
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState />
            )}
          </section>
          <section className="acc-panel">
            <h2>Requests per model</h2>
            {data.byModel.length ? (
              <Table
                headings={[
                  "Model",
                  "Provider",
                  "Requests",
                  "Status",
                  "Estimated cost",
                ]}
              >
                {data.byModel.map((row, index) => (
                  <tr key={index}>
                    <td>{row.model || "Model not recorded"}</td>
                    <td>{row.provider}</td>
                    <td>{row._count}</td>
                    <td>
                      <Status value={row.status} />
                    </td>
                    <td>
                      {row._sum.estimatedCost === null
                        ? "Not available"
                        : `USD ${row._sum.estimatedCost.toFixed(4)}`}
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState />
            )}
          </section>
          <section className="acc-panel">
            <h2>Requests per user</h2>
            {data.byUser.length ? (
              <Table
                headings={[
                  "User ID",
                  "Requests",
                  "Status",
                  "Input / output tokens",
                ]}
              >
                {data.byUser.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <code>{row.userId}</code>
                    </td>
                    <td>{row._count}</td>
                    <td>
                      <Status value={row.status} />
                    </td>
                    <td>
                      {row._sum.inputTokens ?? 0} / {row._sum.outputTokens ?? 0}
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState />
            )}
          </section>
          <SettingsForm kind="limits" role={role} />
        </>
      )}
    </>
  );
}
export function InfrastructurePage({ kind }: { kind: string }) {
  const { data, error, reload, setData } = useAdminData<Infrastructure>(
    kind === "database" ? "database" : "health",
  );
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Loading />;
  return (
    <>
      {failure && <Notice error>{failure}</Notice>}
      <div className="acc-toolbar">
        <p className="acc-muted">
          {dateText(data.checkedAt)} · Provider eksternal tidak dites dari
          halaman ini.
        </p>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setData(await adminRequest<Infrastructure>("health/check", {}));
            } catch (error) {
              setFailure((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Icon name="Activity" size={16} />
          {busy ? "Checking…" : "Check infrastructure"}
        </button>
      </div>
      <div className="acc-health-grid">
        {[
          { name: data.database.engine, ...data.database },
          { name: "Redis / Queue", ...data.redis },
          { name: "Private object storage", ...data.storage },
          {
            name: "Credential encryption",
            status: data.encryption === "ready" ? "ready" : "not_configured",
            latencyMs: null,
          },
        ].map((service) => (
          <article className="acc-health-card" key={service.name}>
            <Icon name="Server" size={24} />
            <h3>{service.name}</h3>
            <Status value={service.status} />
            <small>
              {service.latencyMs === null
                ? "Not checked"
                : `${service.latencyMs} ms`}
            </small>
          </article>
        ))}
      </div>
      <div className="acc-overview-grid">
        <section className="acc-panel">
          <h2>Table statistics</h2>
          <Table headings={["Table", "Rows"]}>
            {data.tables.map((table) => (
              <tr key={table.name}>
                <td>{table.name}</td>
                <td>{table.count}</td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="acc-panel">
          <h2>Storage & authentication</h2>
          <dl className="acc-definition-list">
            <div>
              <dt>Recorded upload storage</dt>
              <dd>{bytesText(data.storageUsage.recordedUploadBytes)}</dd>
            </div>
            <div>
              <dt>Generated assets</dt>
              <dd>{data.storageUsage.generatedAssets}</dd>
            </div>
            <div>
              <dt>Generated asset bytes</dt>
              <dd>Not available</dd>
            </div>
            <div>
              <dt>Backup status</dt>
              <dd>Verification unavailable</dd>
            </div>
            <div>
              <dt>Authentication engine</dt>
              <dd>{data.database.authentication}</dd>
            </div>
          </dl>
          <Notice>{data.database.supabaseAuth}</Notice>
        </section>
      </div>
      <section className="acc-panel">
        <h2>Migration status</h2>
        <Table headings={["Migration", "Status"]}>
          {data.migrations.map((migration) => (
            <tr key={migration.name}>
              <td>
                <code>{migration.name}</code>
              </td>
              <td>
                <Status value={migration.status} />
              </td>
            </tr>
          ))}
        </Table>
      </section>
      {data.queueCounts && (
        <section className="acc-panel">
          <h2>Queue counts</h2>
          <dl className="acc-definition-list">
            {Object.entries(data.queueCounts).map(([name, count]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <Notice>
        Database URL, service role keys, storage secrets, dan master encryption
        key dikelola melalui environment deployment. Tidak ada form untuk
        mengganti koneksi database aktif dari sini.
      </Notice>
      <button className="btn btn-secondary" onClick={() => void reload()}>
        Refresh database snapshot
      </button>
    </>
  );
}
type Job = {
  id: string;
  user: { name: string };
  kind: string;
  status: string;
  stage: string;
  providerId: string | null;
  createdAt: string;
  updatedAt: string;
};
export function JobsPage({ role }: { role: string }) {
  const [status, setStatus] = useState(""),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState("");
  const { data, error, reload } = useAdminData<Job[]>(
    `jobs${status ? `?status=${status}` : ""}`,
  );
  return (
    <>
      {message && <Notice>{message}</Notice>}
      {failure && <Notice error>{failure}</Notice>}
      <div className="acc-toolbar">
        <label className="acc-inline-label">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["queued", "processing", "completed", "failed", "cancelled"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        <button className="btn btn-secondary" onClick={() => void reload()}>
          Refresh
        </button>
      </div>
      {error ? (
        <Notice error>{error}</Notice>
      ) : !data ? (
        <Loading />
      ) : data.length ? (
        <Table
          headings={[
            "Job",
            "User",
            "Type",
            "Status / stage",
            "Duration",
            "Created",
            "Retry",
          ]}
        >
          {data.map((job) => (
            <tr key={job.id}>
              <td>
                <code>{job.id.slice(0, 12)}</code>
              </td>
              <td>{job.user.name}</td>
              <td>{job.kind}</td>
              <td>
                <Status value={job.status} />
                <small>{job.stage}</small>
              </td>
              <td>
                {Math.max(
                  0,
                  Math.round(
                    (Date.parse(job.updatedAt) - Date.parse(job.createdAt)) /
                      1000,
                  ),
                )}{" "}
                s
              </td>
              <td>{dateText(job.createdAt)}</td>
              <td>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={
                    !hasPermission(role, "features.write") ||
                    job.status !== "failed" ||
                    !!job.providerId
                  }
                  onClick={async () => {
                    try {
                      await adminRequest(`jobs/${job.id}/retry`, {});
                      await reload();
                      setMessage("Job dikembalikan ke antrean.");
                    } catch (error) {
                      setFailure((error as Error).message);
                    }
                  }}
                >
                  Retry eligible job
                </button>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          title="No jobs recorded"
          description="Pekerjaan nyata akan muncul setelah fitur dijalankan."
        />
      )}
      <Notice>
        Job dengan ID provider aktif tidak diulang otomatis untuk menghindari
        hasil atau biaya ganda. Completed hanya ditampilkan setelah proses
        selesai.
      </Notice>
    </>
  );
}
type UserRow = {
  monthlyLimit: number;
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  sessions: { id: string; createdAt: string; expiresAt: string }[];
};
export function UsersPage({ role }: { role: string }) {
  const [query, setQuery] = useState(""),
    [failure, setFailure] = useState(""),
    [message, setMessage] = useState("");
  const { data, error, reload } = useAdminData<UserRow[]>(
    `users?q=${encodeURIComponent(query)}`,
  );
  return (
    <>
      {message && <Notice>{message}</Notice>}
      {failure && <Notice error>{failure}</Notice>}
      <div className="acc-toolbar">
        <label className="acc-search">
          <Icon name="Search" size={17} />
          <input
            aria-label="Cari pengguna"
            placeholder="Cari nama atau email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span>Menampilkan hingga 100 akun terbaru.</span>
      </div>
      {error ? (
        <Notice error>{error}</Notice>
      ) : !data ? (
        <Loading />
      ) : data.length ? (
        <Table
          headings={["User", "Role", "Active sessions", "Joined", "Actions"]}
        >
          {data.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </td>
              <td>
                {hasPermission(role, "roles.write") ? (
                  <select
                    aria-label={`Role ${user.name}`}
                    value={user.role}
                    onChange={async (e) => {
                      if (
                        !window.confirm(
                          `Ubah role ${user.name} menjadi ${e.target.value}? Sesi akun tersebut akan dicabut.`,
                        )
                      )
                        return;
                      try {
                        await adminRequest("roles", {
                          userId: user.id,
                          role: e.target.value,
                        });
                        await reload();
                        setMessage("Role diperbarui dan sesi lama dicabut.");
                      } catch (error) {
                        setFailure((error as Error).message);
                      }
                    }}
                  >
                    {["super_admin", "admin", "support", "user"].map((r) => (
                      <option key={r} value={r}>
                        {r.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                ) : (
                  user.role.replaceAll("_", " ")
                )}
              </td>
              <td>{user.sessions.length}</td>
              <td>{dateText(user.createdAt)}</td>
              <td>
                <div className="acc-user-actions">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = new FormData(e.currentTarget);
                      try {
                        await adminRequest(`users/${user.id}/quota`, {
                          monthlyLimit: Number(form.get("limit")),
                        });
                        setMessage("Kuota pengguna disimpan.");
                      } catch (error) {
                        setFailure((error as Error).message);
                      }
                    }}
                  >
                    <input
                      name="limit"
                      type="number"
                      min={0}
                      max={1000000}
                      defaultValue={user.monthlyLimit}
                      aria-label={`Monthly quota ${user.name}`}
                      disabled={!hasPermission(role, "users.write")}
                    />
                    <button disabled={!hasPermission(role, "users.write")}>
                      Save quota
                    </button>
                  </form>
                  <button
                    disabled={!hasPermission(role, "users.write")}
                    onClick={async () => {
                      if (!window.confirm(`Cabut semua sesi ${user.name}?`))
                        return;
                      try {
                        await adminRequest(
                          `users/${user.id}/revoke-sessions`,
                          {},
                        );
                        await reload();
                        setMessage("Sesi pengguna dicabut.");
                      } catch (error) {
                        setFailure((error as Error).message);
                      }
                    }}
                  >
                    Revoke sessions
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState />
      )}
    </>
  );
}
export function RolesPage() {
  const { data, error } = useAdminData<{
    roles: string[];
    permissions: Record<string, string>;
    matrix: Record<string, string[]>;
  }>("roles");
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Loading />;
  return (
    <>
      <Table
        headings={[
          "Permission",
          ...data.roles.map((r) => r.replaceAll("_", " ")),
        ]}
      >
        {Object.entries(data.permissions).map(([key, label]) => (
          <tr key={key}>
            <td>
              <strong>{label}</strong>
              <code>{key}</code>
            </td>
            {data.roles.map((role) => (
              <td key={role}>
                {data.matrix[role].includes(key) ? (
                  <Icon name="CircleCheck" className="acc-allowed" size={18} />
                ) : (
                  <span className="acc-muted">—</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </Table>
      <Notice>
        Hanya Super Admin yang dapat mengubah role. Perubahan role mencabut sesi
        pengguna tersebut, dan Super Admin terakhir tidak boleh dihapus dari
        peran ini.
      </Notice>
      <Link href="/admin/users" className="btn btn-primary">
        Manage user roles
      </Link>
    </>
  );
}
export function LogsPage({ errors = false }: { errors?: boolean }) {
  const { data, error } = useAdminData<unknown>(errors ? "errors" : "activity");
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Loading />;
  if (errors) {
    const values = data as {
      jobs: {
        id: string;
        kind: string;
        updatedAt: string;
        code: string;
        message: string;
      }[];
      providers: {
        id: string;
        errorCode: string | null;
        safeMessage: string | null;
        checkedAt: string | null;
      }[];
    };
    return (
      <>
        {values.jobs.length || values.providers.length ? (
          <Table headings={["Resource", "Code", "Safe description", "Time"]}>
            {values.providers.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
                  <code>{p.errorCode}</code>
                </td>
                <td>{p.safeMessage}</td>
                <td>{dateText(p.checkedAt)}</td>
              </tr>
            ))}
            {values.jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  {job.kind}
                  <small>{job.id}</small>
                </td>
                <td>
                  <code>{job.code}</code>
                </td>
                <td>{job.message}</td>
                <td>{dateText(job.updatedAt)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No errors recorded" />
        )}
        <Notice>
          Payload, isi dokumen, token, dan nilai rahasia tidak ditampilkan dalam
          log admin.
        </Notice>
      </>
    );
  }
  const rows = data as {
    id: string;
    action: string;
    resourceId: string | null;
    createdAt: string;
    user: { name: string } | null;
  }[];
  return rows.length ? (
    <Table headings={["Action", "Actor", "Resource", "Time"]}>
      {rows.map((row) => (
        <tr key={row.id}>
          <td>
            <code>{row.action}</code>
          </td>
          <td>{row.user?.name || "System / deleted account"}</td>
          <td>{row.resourceId || "—"}</td>
          <td>{dateText(row.createdAt)}</td>
        </tr>
      ))}
    </Table>
  ) : (
    <EmptyState title="No activity recorded" />
  );
}
export function SettingsForm({
  kind,
  role,
}: {
  kind: "general" | "limits" | "notifications";
  role: string;
}) {
  const { data, error, reload } = useAdminData<Settings>("settings");
  const [message, setMessage] = useState(""),
    [failure, setFailure] = useState("");
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Loading />;
  return (
    <section className="acc-panel">
      <h2>
        {kind === "limits"
          ? "Usage & queue limits"
          : kind === "notifications"
            ? "Usage notifications"
            : "Control center settings"}
      </h2>
      {message && <Notice>{message}</Notice>}
      {failure && <Notice error>{failure}</Notice>}
      <form
        className="acc-form acc-settings-form"
        key={JSON.stringify(data[kind])}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const value =
            kind === "general"
              ? {
                  name: String(form.get("name")),
                  supportEmail: String(form.get("supportEmail")),
                  timezone: String(form.get("timezone")),
                }
              : kind === "notifications"
                ? {
                    enabled: form.get("enabled") === "on",
                    thresholdPercent: Number(form.get("thresholdPercent")),
                  }
                : {
                    monthlyLimit: Number(form.get("monthlyLimit")),
                    rateLimit: Number(form.get("rateLimit")),
                    monthlyBudget: form.get("monthlyBudget")
                      ? Number(form.get("monthlyBudget"))
                      : null,
                    maxConcurrentJobs: Number(form.get("maxConcurrentJobs")),
                  };
          try {
            await adminRequest("settings", { key: kind, value });
            await reload();
            setMessage("Pengaturan disimpan.");
            setFailure("");
          } catch (error) {
            setFailure((error as Error).message);
          }
        }}
      >
        {kind === "general" ? (
          <>
            <label>
              Workspace display name
              <input
                name="name"
                defaultValue={data.general.name}
                required
                maxLength={50}
              />
            </label>
            <label>
              Support email
              <input
                name="supportEmail"
                type="email"
                defaultValue={data.general.supportEmail}
              />
            </label>
            <label>
              Default timezone
              <input
                name="timezone"
                defaultValue={data.general.timezone}
                required
              />
            </label>
          </>
        ) : kind === "limits" ? (
          <div className="acc-form-grid">
            <label>
              Default requests / user / month
              <input
                type="number"
                name="monthlyLimit"
                defaultValue={data.limits.monthlyLimit}
                min={0}
                max={1000000}
              />
            </label>
            <label>
              User request rate / minute
              <input
                type="number"
                name="rateLimit"
                defaultValue={data.limits.rateLimit}
                min={1}
                max={1000}
              />
            </label>
            <label>
              Monthly budget threshold (USD)
              <input
                type="number"
                name="monthlyBudget"
                step="any"
                defaultValue={data.limits.monthlyBudget ?? ""}
                min={0.01}
              />
            </label>
            <label>
              Max concurrent worker jobs
              <input
                type="number"
                name="maxConcurrentJobs"
                defaultValue={data.limits.maxConcurrentJobs}
                min={1}
                max={20}
              />
            </label>
          </div>
        ) : (
          <>
            <label className="acc-check">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={data.notifications.enabled}
              />
              Notify users when approaching monthly quota
            </label>
            <label>
              Threshold (%)
              <input
                type="number"
                name="thresholdPercent"
                defaultValue={data.notifications.thresholdPercent}
                min={1}
                max={100}
              />
            </label>
          </>
        )}
        <button
          className="btn btn-primary"
          disabled={!hasPermission(role, "settings.write")}
        >
          Save{" "}
          {kind === "limits"
            ? "limits"
            : kind === "notifications"
              ? "notifications"
              : "settings"}
        </button>
      </form>
      {kind === "limits" && (
        <Notice>
          Biaya hanya dihitung jika tarif model diketahui. Worker membaca
          perubahan concurrency pada siklus maintenance berikutnya. Tidak ada
          tagihan aktual yang diasumsikan.
        </Notice>
      )}
      {kind === "notifications" && (
        <Notice>
          Notifikasi penggunaan dikirim di dalam aplikasi dari pemakaian nyata,
          bukan dari angka contoh.
        </Notice>
      )}
    </section>
  );
}
export function SecurityPage() {
  const status = useAdminData<{ enabled: boolean; verified: boolean }>(
      "security/mfa-status",
    ),
    security = useAdminData<{
      role: string;
      sessionExpiresAt: string;
      secureSessionCookies: boolean;
      csrf: string;
      masterKeyStorage: string;
    }>("security");
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(
      null,
    ),
    [code, setCode] = useState(""),
    [recovery, setRecovery] = useState<string[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  return (
    <>
      {error && <Notice error>{error}</Notice>}
      {notice && <Notice>{notice}</Notice>}
      <div className="acc-overview-grid">
        <section className="acc-panel">
          <div className="acc-panel-heading">
            <div>
              <h2>Multi-factor authentication</h2>
              <p>TOTP dan recovery codes untuk akun admin sendiri.</p>
            </div>
            <Status value={status.data?.enabled ? "enabled" : "disabled"} />
          </div>
          {!status.data ? (
            <Loading />
          ) : status.data.enabled ? (
            <button
              className="btn btn-secondary"
              onClick={async () => {
                if (!window.confirm("Nonaktifkan MFA untuk akun sendiri?"))
                  return;
                try {
                  await adminRequest("security/mfa-disable", {});
                  await status.reload();
                  setNotice("MFA dinonaktifkan untuk akun sendiri.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Disable own MFA
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={async () => {
                try {
                  setSetup(await adminRequest("security/mfa-setup", {}));
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Set up MFA
            </button>
          )}
          {setup && (
            <div className="acc-mfa-enroll">
              <p>
                Tambahkan HOLYAI ke aplikasi authenticator dengan kode berikut.
                Kode ini hanya ditampilkan saat penyiapan.
              </p>
              <code>{setup.secret}</code>
              <a href={setup.uri}>Open in authenticator</a>
              <form
                className="acc-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const result = await adminRequest<{
                      recoveryCodes: string[];
                    }>("security/mfa-verify", { code });
                    setRecovery(result.recoveryCodes);
                    setSetup(null);
                    setCode("");
                    await status.reload();
                    setNotice(
                      "MFA aktif. Simpan recovery codes di tempat aman.",
                    );
                  } catch (error) {
                    setError((error as Error).message);
                  }
                }}
              >
                <label>
                  Authenticator code
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                  />
                </label>
                <button className="btn btn-primary">Verify & enable MFA</button>
              </form>
            </div>
          )}
          {!!recovery.length && (
            <div className="acc-recovery-codes">
              <h3>Save these recovery codes</h3>
              <p>
                Setiap kode hanya dapat dipakai sekali dan tidak dapat
                ditampilkan kembali.
              </p>
              {recovery.map((code) => (
                <code key={code}>{code}</code>
              ))}
              <button
                className="btn btn-secondary"
                onClick={() => setRecovery([])}
              >
                Saya sudah menyimpan kode
              </button>
            </div>
          )}
        </section>
        <section className="acc-panel">
          <h2>Access protections</h2>
          {security.data ? (
            <dl className="acc-definition-list">
              <div>
                <dt>Role</dt>
                <dd>{security.data.role}</dd>
              </div>
              <div>
                <dt>Session expiry</dt>
                <dd>{dateText(security.data.sessionExpiresAt)}</dd>
              </div>
              <div>
                <dt>CSRF</dt>
                <dd>{security.data.csrf}</dd>
              </div>
              <div>
                <dt>Encryption master key</dt>
                <dd>{security.data.masterKeyStorage}</dd>
              </div>
              <div>
                <dt>Secrets in GET responses</dt>
                <dd>Masked metadata only</dd>
              </div>
            </dl>
          ) : (
            <Loading />
          )}
          <Notice>
            Role diperiksa ulang dari database. Secret provider tidak pernah
            dikirim kembali dalam bentuk aslinya setelah tersimpan.
          </Notice>
        </section>
      </div>
    </>
  );
}
export function DeploymentPage() {
  const { data, error } = useAdminData<Deployment>("deployment");
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Loading />;
  return (
    <>
      <div className="acc-metrics">
        <Metric label="Environment" value={data.environment} icon="Cloud" />
        <Metric
          label="Application version"
          value={data.version}
          icon="Package"
        />
        <Metric
          label="Build"
          value={data.build?.slice(0, 14) || "Not available"}
          icon="GitCommitHorizontal"
        />
        <Metric
          label="Transport"
          value={data.tls ? "HTTPS" : "Local HTTP"}
          icon="LockKeyhole"
        />
      </div>
      <section className="acc-panel">
        <h2>Deployment configuration</h2>
        <p className="acc-muted">
          Hanya nama dan keberadaan konfigurasi yang ditampilkan. Tidak ada
          nilai rahasia.
        </p>
        <Table headings={["Service configuration", "Status"]}>
          {data.services.map((service) => (
            <tr key={service.name}>
              <td>
                <code>{service.name}</code>
              </td>
              <td>
                <Status
                  value={service.configured ? "configured" : "not_configured"}
                />
              </td>
            </tr>
          ))}
        </Table>
      </section>
      <section className="acc-panel">
        <h2>Deployment notes</h2>
        <dl className="acc-definition-list">
          <div>
            <dt>Platform</dt>
            <dd>{data.platform}</dd>
          </div>
          <div>
            <dt>Worker</dt>
            <dd>{data.worker}</dd>
          </div>
          <div>
            <dt>Backup</dt>
            <dd>{data.backupStatus}</dd>
          </div>
        </dl>
        <Notice>
          Untuk Supabase, gunakan pooled database URL yang sesuai serta jalankan
          migrasi dari lingkungan deployment. Auth akun saat ini tetap memakai
          Better Auth. Rahasia infrastruktur membutuhkan pengaturan platform dan
          dapat memerlukan restart atau redeploy.
        </Notice>
      </section>
    </>
  );
}
