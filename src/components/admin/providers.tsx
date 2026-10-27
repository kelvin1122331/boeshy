"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/common";
import { credentialFields, type AuthMethod } from "@/config/providers";
import { hasPermission } from "@/lib/permissions";
import {
  adminRequest,
  useAdminData,
  Notice,
  Status,
  EmptyState,
  Loading,
  dateText,
  type ProviderRow,
  type FeatureRow,
} from "./shared";
const configForm = z.object({
  authMethod: z.string(),
  endpoint: z.string().max(300),
  defaultModel: z.string().max(150),
  timeoutMs: z.number().int().min(1000).max(120000),
  retryAttempts: z.number().int().min(0).max(2),
  requestLimit: z.number().int().min(1).max(10000),
  priority: z.number().int().min(1).max(100),
  enabled: z.boolean(),
  credentials: z.record(z.string(), z.string()),
  maxResults: z.number().int().min(1).max(50),
  contactEmail: z.string(),
  scopes: z.string(),
  countries: z.string(),
  defaultCountry: z.string(),
});
type ConfigForm = z.infer<typeof configForm>;
export function ProviderDrawer({
  provider,
  rotate,
  onClose,
  onSaved,
}: {
  provider: ProviderRow;
  rotate: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const form = useForm<ConfigForm>({
    resolver: zodResolver(configForm),
    defaultValues: {
      authMethod: provider.authMethod,
      endpoint: provider.endpoint,
      defaultModel: provider.defaultModel || "",
      timeoutMs: provider.timeoutMs,
      retryAttempts: provider.retryAttempts,
      requestLimit: provider.requestLimit,
      priority: provider.priority,
      enabled: provider.enabled,
      credentials: {},
      maxResults: provider.settings.maxResults || 10,
      contactEmail: provider.settings.contactEmail || "",
      scopes: (provider.settings.scopes || []).join("\n"),
      countries: (provider.settings.countries || []).join(", "),
      defaultCountry: provider.settings.defaultCountry || "gb",
    },
  });
  const method = useWatch({
      control: form.control,
      name: "authMethod",
    }) as AuthMethod,
    fields = credentialFields(provider.definition, method);
  return (
    <Dialog.Root
      open
      onOpenChange={(value) => {
        if (!value) {
          form.reset();
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="acc-dialog-overlay" />
        <Dialog.Content
          className="acc-drawer"
          aria-describedby="provider-drawer-description"
        >
          <header>
            <div>
              <span className="acc-kicker">PROVIDER CONFIGURATION</span>
              <Dialog.Title>
                {rotate ? "Rotate credentials" : provider.definition.name}
              </Dialog.Title>
            </div>
            <Dialog.Close aria-label="Tutup konfigurasi provider">
              <Icon name="X" />
            </Dialog.Close>
          </header>
          <Dialog.Description id="provider-drawer-description">
            {rotate
              ? "Isi rahasia baru. Field kosong mempertahankan nilai yang tersimpan."
              : "Konfigurasi disimpan oleh server. Secret yang sudah tersimpan tidak dapat dibaca kembali."}
          </Dialog.Description>
          <form
            className="acc-form"
            onSubmit={form.handleSubmit(async (values) => {
              setError("");
              try {
                const settings = {
                  ...provider.settings,
                  ...(["search", "academic"].includes(provider.definition.group)
                    ? {
                        maxResults: values.maxResults,
                        contactEmail: values.contactEmail,
                      }
                    : {}),
                  ...(["canva", "google", "social"].includes(
                    provider.definition.group,
                  )
                    ? { scopes: values.scopes.split(/\s+/).filter(Boolean) }
                    : {}),
                  ...(provider.id === "adzuna"
                    ? {
                        countries: values.countries
                          .split(/[,\s]+/)
                          .filter(Boolean),
                        defaultCountry: values.defaultCountry,
                      }
                    : {}),
                };
                await adminRequest(
                  `providers/${provider.id}${rotate ? "/rotate" : ""}`,
                  {
                    authMethod: values.authMethod,
                    endpoint: values.endpoint,
                    defaultModel: values.defaultModel || null,
                    enabled: values.enabled,
                    timeoutMs: values.timeoutMs,
                    retryAttempts: values.retryAttempts,
                    requestLimit: values.requestLimit,
                    priority: values.priority,
                    settings,
                    credentials: values.credentials,
                    revision: provider.revision,
                  },
                );
                form.reset();
                onSaved();
                onClose();
              } catch (error) {
                setError((error as Error).message);
              }
            })}
          >
            {error && <Notice error>{error}</Notice>}
            <section>
              <h3>Autentikasi</h3>
              <label>
                Authentication method
                <select {...form.register("authMethod")}>
                  {provider.definition.auth.map((method) => (
                    <option key={method} value={method}>
                      {
                        {
                          api_key: "API Key",
                          oauth2: "OAuth 2.0",
                          client_credentials: "Client ID + Secret",
                          bearer: "Bearer Token",
                          service_account: "Service Account",
                          public: "Public API / No Credentials",
                        }[method]
                      }
                    </option>
                  ))}
                </select>
              </label>
              {Object.entries(fields).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="password"
                    autoComplete="new-password"
                    spellCheck={false}
                    {...form.register(`credentials.${key}`)}
                    placeholder={
                      provider.credential?.masked[key] || "Belum disimpan"
                    }
                  />
                  {provider.credential?.masked[key] && (
                    <small>
                      Tersimpan: {provider.credential.masked[key]} · isi hanya
                      untuk mengganti.
                    </small>
                  )}
                </label>
              ))}
              {!Object.keys(fields).length && (
                <p className="acc-muted">
                  Endpoint publik ini tidak memerlukan kredensial untuk akses
                  dasar yang tersedia.
                </p>
              )}
              {provider.redirectUri && (
                <label>
                  Redirect URI (dari server)
                  <input readOnly value={provider.redirectUri} />
                </label>
              )}
              {provider.definition.note && (
                <Notice>{provider.definition.note}</Notice>
              )}
            </section>
            <section>
              <h3>Provider settings</h3>
              <label>
                Endpoint resmi
                <input
                  readOnly={provider.id !== "custom"}
                  {...form.register("endpoint")}
                />
              </label>
              {provider.definition.group === "ai" && (
                <label>
                  Default model identifier
                  <input
                    {...form.register("defaultModel")}
                    placeholder="Isi model yang tersedia pada akun provider"
                  />
                  <small>
                    Daftarkan model dan capability-nya di Model Management
                    sebelum digunakan.
                  </small>
                </label>
              )}
              <div className="acc-form-grid">
                <label>
                  Timeout (ms)
                  <input
                    type="number"
                    {...form.register("timeoutMs", { valueAsNumber: true })}
                  />
                </label>
                <label>
                  Retry attempts
                  <input
                    type="number"
                    min={0}
                    max={2}
                    {...form.register("retryAttempts", { valueAsNumber: true })}
                  />
                </label>
                <label>
                  Requests per minute
                  <input
                    type="number"
                    {...form.register("requestLimit", { valueAsNumber: true })}
                  />
                </label>
                <label>
                  Priority (1–100)
                  <input
                    type="number"
                    {...form.register("priority", { valueAsNumber: true })}
                  />
                </label>
              </div>
              {["search", "academic"].includes(provider.definition.group) && (
                <>
                  <label>
                    Max results
                    <input
                      type="number"
                      {...form.register("maxResults", { valueAsNumber: true })}
                    />
                  </label>
                  <label>
                    Contact email (opsional)
                    <input type="email" {...form.register("contactEmail")} />
                  </label>
                </>
              )}
              {["canva", "google", "social"].includes(
                provider.definition.group,
              ) && (
                <label>
                  Requested scopes
                  <textarea
                    rows={4}
                    {...form.register("scopes")}
                    placeholder="Satu scope per baris; gunakan izin minimum."
                  />
                </label>
              )}
              {provider.id === "adzuna" && (
                <div className="acc-form-grid">
                  <label>
                    Supported countries
                    <input
                      {...form.register("countries")}
                      placeholder="gb, us, sg"
                    />
                  </label>
                  <label>
                    Default country
                    <input maxLength={2} {...form.register("defaultCountry")} />
                  </label>
                </div>
              )}
              <label className="acc-check">
                <input type="checkbox" {...form.register("enabled")} />
                Enable provider for configured features
              </label>
            </section>
            {Object.values(form.formState.errors).length > 0 && (
              <Notice error>Periksa field dan batas angka yang diisi.</Notice>
            )}
            <footer className="acc-drawer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? "Menyimpan…"
                  : rotate
                    ? "Rotate Credentials"
                    : "Save Configuration"}
              </button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ProvidersPage({
  section,
  role,
}: {
  section: string;
  role: string;
}) {
  const { data, error, reload } = useAdminData<ProviderRow[]>("providers");
  const features = useAdminData<FeatureRow[]>("features");
  const settings = useAdminData<{ primary: Record<string, string> }>(
    "settings",
  );
  const [selected, setSelected] = useState<ProviderRow | null>(null),
    [rotate, setRotate] = useState(false),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState(""),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState<string | null>(null),
    [test, setTest] = useState<{
      id: string;
      message: string;
      status: string;
      code: string;
      checkedAt: string;
      latencyMs: number | null;
      models?: { identifier: string; name: string }[];
    } | null>(null);
  const write = hasPermission(role, "providers.write");
  const group = section.startsWith("integrations/")
    ? section.split("/")[1]
    : null;
  const visible = data?.filter(
    (provider) =>
      (!group
        ? section === "ai-providers"
          ? provider.definition.group === "ai"
          : true
        : group === "image" || group === "video"
          ? provider.definition.capabilities.includes(group)
          : provider.definition.group === group) &&
      `${provider.definition.name} ${provider.definition.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function action(provider: ProviderRow, name: string) {
    setBusy(provider.id);
    setActionError("");
    setNotice("");
    try {
      if (name === "test") {
        const result = await adminRequest<Omit<NonNullable<typeof test>, "id">>(
          `providers/${provider.id}/test`,
          {},
        );
        setTest({ id: provider.id, ...result });
      } else {
        await adminRequest(`providers/${provider.id}/${name}`, {});
        setNotice(
          name === "delete-credentials"
            ? "Kredensial dicabut dan provider dinonaktifkan."
            : "Status provider diperbarui.",
        );
      }
      await reload();
      await features.reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Loading />;
  return (
    <>
      {notice && <Notice>{notice}</Notice>}
      {actionError && <Notice error>{actionError}</Notice>}
      <div className="acc-toolbar">
        <label className="acc-search">
          <Icon name="Search" size={17} />
          <input
            aria-label="Cari provider"
            placeholder="Cari provider atau integrasi…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span>
          {visible?.length || 0} providers ·{" "}
          {data.filter((p) => p.status === "connected").length} verified
        </span>
      </div>
      {group &&
        ["search", "academic", "jobs"].includes(group) &&
        settings.data && (
          <div className="acc-primary-service">
            <div>
              <strong>Primary {group} provider</strong>
              <p>
                Hanya provider pilihan yang digunakan. Tidak ada perpindahan
                otomatis tanpa kebijakan fallback.
              </p>
            </div>
            <select
              aria-label="Primary service provider"
              disabled={!hasPermission(role, "settings.write")}
              value={settings.data.primary[group]}
              onChange={async (e) => {
                try {
                  await adminRequest("settings", {
                    key: `primary.${group}`,
                    value: e.target.value,
                  });
                  await settings.reload();
                  await features.reload();
                  setNotice("Penyedia utama diperbarui.");
                } catch (error) {
                  setActionError((error as Error).message);
                }
              }}
            >
              {data
                .filter((p) => p.definition.group === group)
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.definition.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      <div className="acc-provider-grid">
        {visible?.map((provider) => {
          const assigned =
            features.data?.filter((f) => f.model?.providerId === provider.id) ||
            [];
          return (
            <article className="acc-provider-card" key={provider.id}>
              <header>
                <span className="acc-provider-icon">
                  <Icon name={provider.definition.icon} size={26} />
                </span>
                <Status value={provider.status} />
              </header>
              <h2>{provider.definition.name}</h2>
              <p>{provider.definition.description}</p>
              <dl>
                <div>
                  <dt>Credentials</dt>
                  <dd>
                    {provider.credential
                      ? `Encrypted · v${provider.credential.version}`
                      : provider.authMethod === "public"
                        ? "Public access"
                        : "Not configured"}
                  </dd>
                </div>
                <div>
                  <dt>Assigned features</dt>
                  <dd>
                    {assigned.length
                      ? assigned.map((f) => f.name).join(", ")
                      : "Belum ada penetapan"}
                  </dd>
                </div>
                <div>
                  <dt>Last check</dt>
                  <dd>{dateText(provider.checkedAt)}</dd>
                </div>
              </dl>
              {provider.credential && (
                <div className="acc-mask">
                  {Object.entries(provider.credential.masked).map(
                    ([key, mask]) => (
                      <span key={key}>
                        {key}: <code>{mask}</code>
                      </span>
                    ),
                  )}
                </div>
              )}
              {provider.safeMessage && (
                <small className="acc-provider-result">
                  {provider.safeMessage}
                </small>
              )}
              <footer>
                <button
                  className="btn btn-primary"
                  disabled={!write || busy === provider.id}
                  onClick={() => {
                    setRotate(false);
                    setSelected(provider);
                  }}
                >
                  <Icon name="Settings2" size={15} />
                  Configure
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={!write || !provider.canTest || busy === provider.id}
                  onClick={() => void action(provider, "test")}
                >
                  {busy === provider.id ? "Memeriksa…" : "Test Connection"}
                </button>
              </footer>
              <div className="acc-provider-actions">
                <button
                  disabled={
                    !write || busy === provider.id || !provider.configured
                  }
                  onClick={() =>
                    void action(
                      provider,
                      provider.enabled ? "disable" : "enable",
                    )
                  }
                >
                  {provider.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  disabled={!write || !provider.credential}
                  onClick={() => {
                    setRotate(true);
                    setSelected(provider);
                  }}
                >
                  Rotate
                </button>
                <button
                  disabled={!write || !provider.credential}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Hapus kredensial ${provider.definition.name} dan nonaktifkan provider?`,
                      )
                    )
                      void action(provider, "delete-credentials");
                  }}
                >
                  Delete credentials
                </button>
              </div>
              {["canva", "google"].includes(provider.id) && (
                <div className="acc-oauth-actions">
                  <a
                    className={`btn btn-secondary${!provider.configured || !provider.enabled ? " acc-disabled-link" : ""}`}
                    aria-disabled={!provider.configured || !provider.enabled}
                    href={
                      provider.configured && provider.enabled
                        ? `/api/integrations/${provider.id}/connect`
                        : undefined
                    }
                  >
                    Connect {provider.definition.name}
                  </a>
                  <button
                    className="btn btn-ghost"
                    disabled={!write}
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `/api/integrations/${provider.id}/disconnect`,
                          { method: "POST" },
                        );
                        if (!response.ok)
                          throw new Error("Koneksi belum dapat diputus.");
                        setNotice(
                          "Koneksi akun sendiri diputus. Akun pengguna lain tidak diubah.",
                        );
                      } catch (e) {
                        setActionError((e as Error).message);
                      }
                    }}
                  >
                    Disconnect own account
                  </button>
                  <small>
                    Persetujuan per pengguna. Koneksi admin tidak dibagikan ke
                    pengguna lain.
                  </small>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {!visible?.length && (
        <EmptyState
          title="Provider tidak ditemukan"
          description="Coba kata kunci lain."
        />
      )}
      {test && (
        <section className="acc-panel">
          <div className="acc-panel-heading">
            <div>
              <h2>
                Connection test ·{" "}
                {data.find((p) => p.id === test.id)?.definition.name}
              </h2>
              <p>
                {dateText(test.checkedAt)} ·{" "}
                {test.latencyMs === null
                  ? "Latency unavailable"
                  : `${test.latencyMs} ms`}
              </p>
            </div>
            <Status value={test.status} />
          </div>
          <p>{test.message}</p>
          <small className="acc-muted">Result code: {test.code}</small>
          {!!test.models?.length && (
            <details className="acc-disclosure">
              <summary>
                {test.models.length} model identifiers returned by provider
              </summary>
              <ul>
                {test.models.map((model) => (
                  <li key={model.identifier}>
                    <code>{model.identifier}</code> — {model.name}
                  </li>
                ))}
              </ul>
              <p>
                Capability dan assignment tetap harus ditentukan melalui Model
                Management.
              </p>
            </details>
          )}
        </section>
      )}
      {group === "image" && (
        <Notice>
          Adapter saat ini mendukung text-to-image dengan keluaran PNG. Image
          editing dan image-to-image tidak ditampilkan sebagai fitur aktif.
        </Notice>
      )}
      {group === "video" && (
        <Notice>
          Video menggunakan job asynchronous. Status completed hanya tersedia
          setelah file video berhasil diterima dan disimpan.
        </Notice>
      )}
      {group === "social" && (
        <Notice>
          Connector sosial disiapkan sebagai fondasi. Pencarian konten sosial
          belum diaktifkan, dan tidak ada akses privat tanpa persetujuan resmi.
        </Notice>
      )}
      {selected && (
        <ProviderDrawer
          provider={selected}
          rotate={rotate}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setNotice("Konfigurasi disimpan dengan aman.");
            void reload();
            void features.reload();
          }}
        />
      )}
    </>
  );
}
