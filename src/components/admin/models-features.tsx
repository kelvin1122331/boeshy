"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/common";
import {
  capabilityNames,
  providers,
  type Capability,
} from "@/config/providers";
import { hasPermission } from "@/lib/permissions";
import {
  adminRequest,
  useAdminData,
  Notice,
  Status,
  EmptyState,
  Loading,
  Table,
  type ModelRow,
  type FeatureRow,
} from "./shared";
function Editor({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="acc-dialog-overlay" />
        <Dialog.Content className="acc-editor">
          <header>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close aria-label="Tutup editor">
              <Icon name="X" />
            </Dialog.Close>
          </header>
          <Dialog.Description>{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ModelsPage({ role }: { role: string }) {
  const { data, error, reload } = useAdminData<ModelRow[]>("models");
  const [selected, setSelected] = useState<ModelRow | null | undefined>(
      undefined,
    ),
    [notice, setNotice] = useState(""),
    [failure, setFailure] = useState(""),
    [query, setQuery] = useState("");
  const canWrite = hasPermission(role, "models.write");
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Loading />;
  return (
    <>
      {notice && <Notice>{notice}</Notice>}
      {failure && <Notice error>{failure}</Notice>}
      <div className="acc-toolbar">
        <label className="acc-search">
          <Icon name="Search" size={17} />
          <input
            aria-label="Cari model"
            placeholder="Cari model atau provider…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className="btn btn-primary"
          disabled={!canWrite}
          onClick={() => setSelected(null)}
        >
          <Icon name="Plus" size={16} />
          Add model
        </button>
      </div>
      {data.length ? (
        <Table
          headings={[
            "Model",
            "Provider",
            "Capabilities",
            "Context",
            "Status",
            "Actions",
          ]}
        >
          {data
            .filter((m) =>
              `${m.name} ${m.identifier} ${m.providerId}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((model) => (
              <tr key={model.id}>
                <td>
                  <strong>{model.name}</strong>
                  <code>{model.identifier}</code>
                </td>
                <td>
                  {providers.find((p) => p.id === model.providerId)?.name ||
                    model.providerId}
                </td>
                <td>
                  <div className="acc-tags">
                    {model.capabilities.map((c) => (
                      <span key={c}>
                        {capabilityNames[c as Capability] || c}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{model.contextLimit?.toLocaleString() || "Unknown"}</td>
                <td>
                  <Status value={model.enabled ? "enabled" : "disabled"} />
                </td>
                <td>
                  <div className="acc-row-actions">
                    <button
                      disabled={!canWrite}
                      onClick={() => setSelected(model)}
                    >
                      Edit
                    </button>
                    <button
                      disabled={!canWrite}
                      onClick={async () => {
                        if (!window.confirm(`Hapus model ${model.name}?`))
                          return;
                        try {
                          await adminRequest(
                            `models/${model.id}`,
                            undefined,
                            "DELETE",
                          );
                          await reload();
                          setNotice("Model dihapus.");
                        } catch (e) {
                          setFailure((e as Error).message);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
        </Table>
      ) : (
        <EmptyState
          title="Belum ada model terdaftar"
          description="Tambahkan identifier dari akun provider. Tidak ada model atau capability yang dianggap aktif secara otomatis."
        />
      )}
      <Notice>
        Capability dipilih sesuai adapter yang tersedia dan model provider yang
        kamu gunakan. Harga bersifat opsional; biaya estimasi tidak ditampilkan
        jika tarif belum diketahui.
      </Notice>
      {selected !== undefined && (
        <ModelEditor
          current={selected}
          onClose={() => setSelected(undefined)}
          onSave={() => {
            void reload();
            setNotice("Model disimpan.");
          }}
        />
      )}
    </>
  );
}
function ModelEditor({
  current,
  onClose,
  onSave,
}: {
  current: ModelRow | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [value, setValue] = useState<ModelRow>(
      current || {
        id: "",
        providerId: "gemini",
        identifier: "",
        name: "",
        capabilities: ["text"],
        contextLimit: null,
        inputType: "text",
        outputType: "text",
        enabled: false,
        inputCostPerMillion: null,
        outputCostPerMillion: null,
        settings: {},
      },
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const provider = providers.find((p) => p.id === value.providerId)!;
  return (
    <Editor
      title={current ? "Edit model" : "Add model"}
      description="Masukkan identifier yang benar-benar tersedia pada akun provider. Tidak ada panggilan eksternal saat menyimpan."
      onClose={onClose}
    >
      <form
        className="acc-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await adminRequest("models", {
              ...value,
              id: value.id || undefined,
            });
            onSave();
            onClose();
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <Notice error>{error}</Notice>}
        <div className="acc-form-grid">
          <label>
            Provider
            <select
              value={value.providerId}
              onChange={(e) =>
                setValue({
                  ...value,
                  providerId: e.target.value,
                  capabilities: [],
                  settings: {},
                })
              }
            >
              {providers
                .filter((p) => p.group === "ai" && p.capabilities.length)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Display name
            <input
              required
              maxLength={100}
              value={value.name}
              onChange={(e) => setValue({ ...value, name: e.target.value })}
            />
          </label>
        </div>
        <label>
          Model identifier
          <input
            required
            maxLength={150}
            value={value.identifier}
            onChange={(e) => setValue({ ...value, identifier: e.target.value })}
            placeholder="Identifier dari provider"
          />
        </label>
        <fieldset>
          <legend>Supported capabilities</legend>
          <div className="acc-check-grid">
            {Object.entries(capabilityNames)
              .filter(
                ([cap]) =>
                  !["search", "academic", "jobs", "oauth"].includes(cap),
              )
              .map(([cap, name]) => (
                <label className="acc-check" key={cap}>
                  <input
                    type="checkbox"
                    disabled={
                      !provider.capabilities.includes(cap as Capability)
                    }
                    checked={value.capabilities.includes(cap)}
                    onChange={(e) =>
                      setValue({
                        ...value,
                        capabilities: e.target.checked
                          ? [...value.capabilities, cap]
                          : value.capabilities.filter((c) => c !== cap),
                      })
                    }
                  />
                  {name}
                </label>
              ))}
          </div>
          <small>Opsi yang tidak didukung adapter dinonaktifkan.</small>
        </fieldset>
        <div className="acc-form-grid">
          <label>
            Context limit (optional)
            <input
              type="number"
              min={1}
              value={value.contextLimit ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  contextLimit: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
          <label>
            Input type
            <select
              value={value.inputType}
              onChange={(e) =>
                setValue({ ...value, inputType: e.target.value })
              }
            >
              {["text", "text,image", "audio", "multimodal"].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Output type
            <select
              value={value.outputType}
              onChange={(e) =>
                setValue({ ...value, outputType: e.target.value })
              }
            >
              {["text", "image", "video", "audio"].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Input cost / 1M tokens (USD)
            <input
              type="number"
              min={0}
              step="any"
              value={value.inputCostPerMillion ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  inputCostPerMillion: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </label>
          <label>
            Output cost / 1M tokens (USD)
            <input
              type="number"
              min={0}
              step="any"
              value={value.outputCostPerMillion ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  outputCostPerMillion: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </label>
        </div>
        {value.capabilities.includes("image") && (
          <fieldset>
            <legend>Supported image ratios</legend>
            <div className="acc-check-grid">
              {["1:1", "3:2", "2:3"].map((ratio) => (
                <label key={ratio} className="acc-check">
                  <input
                    type="checkbox"
                    checked={
                      value.settings.imageRatios?.includes(ratio) || false
                    }
                    onChange={(e) =>
                      setValue({
                        ...value,
                        settings: {
                          ...value.settings,
                          imageRatios: e.target.checked
                            ? [...(value.settings.imageRatios || []), ratio]
                            : (value.settings.imageRatios || []).filter(
                                (r) => r !== ratio,
                              ),
                          outputFormats: ["png"],
                        },
                      })
                    }
                  />
                  {ratio}
                </label>
              ))}
            </div>
            <small>Adapter saat ini menghasilkan PNG.</small>
          </fieldset>
        )}
        {value.capabilities.includes("video") && (
          <fieldset>
            <legend>Supported video options</legend>
            <div className="acc-check-grid">
              {["16:9", "9:16"].map((ratio) => (
                <label key={ratio} className="acc-check">
                  <input
                    type="checkbox"
                    checked={
                      value.settings.videoRatios?.includes(ratio) || false
                    }
                    onChange={(e) =>
                      setValue({
                        ...value,
                        settings: {
                          ...value.settings,
                          videoRatios: e.target.checked
                            ? [...(value.settings.videoRatios || []), ratio]
                            : (value.settings.videoRatios || []).filter(
                                (r) => r !== ratio,
                              ),
                        },
                      })
                    }
                  />
                  {ratio}
                </label>
              ))}
              {[4, 8, 12].map((duration) => (
                <label key={duration} className="acc-check">
                  <input
                    type="checkbox"
                    checked={
                      value.settings.videoDurations?.includes(duration) || false
                    }
                    onChange={(e) =>
                      setValue({
                        ...value,
                        settings: {
                          ...value.settings,
                          videoDurations: e.target.checked
                            ? [
                                ...(value.settings.videoDurations || []),
                                duration,
                              ]
                            : (value.settings.videoDurations || []).filter(
                                (r) => r !== duration,
                              ),
                          outputFormats: ["mp4"],
                        },
                      })
                    }
                  />
                  {duration} seconds
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label className="acc-check">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => setValue({ ...value, enabled: e.target.checked })}
          />
          Enable model
        </label>
        <footer className="acc-drawer-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Menyimpan…" : "Save model"}
          </button>
        </footer>
      </form>
    </Editor>
  );
}
export function FeaturesPage({
  routing = false,
  role,
}: {
  routing?: boolean;
  role: string;
}) {
  const { data, error, reload } = useAdminData<FeatureRow[]>("features");
  const models = useAdminData<ModelRow[]>("models");
  const [selected, setSelected] = useState<FeatureRow | null>(null),
    [notice, setNotice] = useState("");
  const canWrite = hasPermission(
    role,
    routing ? "models.write" : "features.write",
  );
  if (error) return <Notice error>{error}</Notice>;
  if (!data) return <Loading />;
  return (
    <>
      {notice && <Notice>{notice}</Notice>}
      {routing && (
        <div className="acc-routing-diagram" aria-label="Diagram routing AI">
          <div>
            <Icon name="AppWindow" />
            <strong>Feature request</strong>
            <small>Flag, quota, capability</small>
          </div>
          <Icon name="ArrowRight" />
          <div>
            <Icon name="Network" />
            <strong>Primary model</strong>
            <small>Provider configured & enabled</small>
          </div>
          <Icon name="ArrowRight" />
          <div>
            <Icon name="ShieldCheck" />
            <strong>Explicit fallback</strong>
            <small>Only with consent & compatible model</small>
          </div>
        </div>
      )}
      <Table
        headings={[
          "Feature",
          "Status",
          "Primary model",
          "Dependencies",
          "Limit / month",
          "Actions",
        ]}
      >
        {data.map((feature) => (
          <tr key={feature.id}>
            <td>
              <div className="acc-feature-name">
                <Icon name={feature.icon} size={18} />
                <strong>{feature.name}</strong>
              </div>
              <small>{feature.category}</small>
            </td>
            <td>
              <Status value={feature.status} />
            </td>
            <td>
              {feature.model?.name || feature.capability === null
                ? feature.model?.name || "Local database"
                : feature.capability === "academic"
                  ? "Academic service"
                  : "Not assigned"}
              {feature.config.fallbackEnabled && (
                <small>Fallback configured</small>
              )}
            </td>
            <td>
              {feature.dependencies.length ? (
                <div className="acc-tags">
                  {feature.dependencies.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              ) : (
                <span className="acc-muted">Dependencies available</span>
              )}
            </td>
            <td>{feature.config.monthlyLimit}</td>
            <td>
              <button
                className="btn btn-secondary btn-sm"
                disabled={!canWrite}
                onClick={() => setSelected(feature)}
              >
                Configure
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <Notice>
        Ready berarti dependensi konfigurasi tersedia. Keberhasilan API tetap
        ditentukan oleh respons aktual, bukan oleh tombol Enable.
      </Notice>
      {selected && (
        <FeatureEditor
          feature={selected}
          models={models.data || []}
          onClose={() => setSelected(null)}
          onSave={() => {
            void reload();
            setNotice("Konfigurasi fitur diperbarui.");
          }}
        />
      )}
    </>
  );
}
function FeatureEditor({
  feature,
  models,
  onClose,
  onSave,
}: {
  feature: FeatureRow;
  models: ModelRow[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [value, setValue] = useState(feature.config),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const compatible = models.filter(
    (m) =>
      m.enabled &&
      (!feature.capability || m.capabilities.includes(feature.capability)),
  );
  return (
    <Editor
      title={feature.name}
      description="Perubahan ini dibaca server saat fitur dijalankan. Menonaktifkan fitur tidak menghapus karya yang sudah ada."
      onClose={onClose}
    >
      <form
        className="acc-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const { lastError, ...input } = value;
            void lastError;
            await adminRequest(`features/${feature.id}`, input);
            onSave();
            onClose();
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <Notice error>{error}</Notice>}
        <label className="acc-check">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => setValue({ ...value, enabled: e.target.checked })}
          />
          Enable feature
        </label>
        {feature.capability !== null && feature.capability !== "academic" && (
          <>
            <label>
              Primary model
              <select
                value={value.primaryModelId || ""}
                onChange={(e) =>
                  setValue({ ...value, primaryModelId: e.target.value || null })
                }
              >
                <option value="">Default by enabled provider priority</option>
                {compatible.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} · {model.providerId}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Secondary model
              <select
                value={value.secondaryModelId || ""}
                disabled={feature.capability !== "text"}
                onChange={(e) =>
                  setValue({
                    ...value,
                    secondaryModelId: e.target.value || null,
                  })
                }
              >
                <option value="">No fallback</option>
                {compatible
                  .filter((m) => m.id !== value.primaryModelId)
                  .map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} · {model.providerId}
                    </option>
                  ))}
              </select>
            </label>
            <label className="acc-check">
              <input
                type="checkbox"
                checked={value.fallbackEnabled}
                disabled={feature.capability !== "text"}
                onChange={(e) =>
                  setValue({ ...value, fallbackEnabled: e.target.checked })
                }
              />
              Enable fallback
            </label>
            <label className="acc-check">
              <input
                type="checkbox"
                checked={value.fallbackConsent}
                disabled={feature.capability !== "text"}
                onChange={(e) =>
                  setValue({ ...value, fallbackConsent: e.target.checked })
                }
              />
              Izinkan pengiriman materi ke model cadangan sesuai kebijakan data
              workspace.
            </label>
          </>
        )}
        <div className="acc-form-grid">
          <label>
            Monthly per-user limit
            <input
              type="number"
              min={0}
              max={1000000}
              value={value.monthlyLimit}
              onChange={(e) =>
                setValue({ ...value, monthlyLimit: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Timeout (ms)
            <input
              type="number"
              min={1000}
              max={120000}
              value={value.timeoutMs}
              onChange={(e) =>
                setValue({ ...value, timeoutMs: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Retry attempts (0–2)
            <input
              type="number"
              min={0}
              max={2}
              value={value.retryAttempts}
              disabled={["image", "video"].includes(feature.capability || "")}
              onChange={(e) =>
                setValue({ ...value, retryAttempts: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label className="acc-check">
          <input
            type="checkbox"
            checked={value.queueEnabled}
            onChange={(e) =>
              setValue({ ...value, queueEnabled: e.target.checked })
            }
          />
          Allow background queue processing
        </label>
        <Notice>
          Retry tidak dilakukan setelah chat stream sudah mengirim sebagian
          respons, untuk mencegah keluaran ganda. Model cadangan tidak dipakai
          tanpa persetujuan. Fallback hanya tersedia untuk teks; generasi gambar
          dan video tidak diulang atau dialihkan otomatis.
        </Notice>
        <footer className="acc-drawer-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Menyimpan…" : "Save configuration"}
          </button>
        </footer>
      </form>
    </Editor>
  );
}
