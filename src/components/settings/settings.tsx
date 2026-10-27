"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { api, useAPI, type Capabilities } from "@/hooks/use-api";
import { PageHeader, Field, Alert, Icon, Modal } from "@/components/common";
import { Button } from "@/components/ui/button";
const tabs = [
  ["profile", "Profil & keamanan"],
  ["appearance", "Tampilan"],
  ["integrations", "Integrasi"],
  ["usage", "Penggunaan"],
  ["privacy", "Privasi & data"],
];
export function Settings({ tab = "profile" }: { tab?: string }) {
  const { data: session } = authClient.useSession();
  const { data: caps } = useAPI<Capabilities>("capabilities");
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState<string | undefined>(undefined),
    [timezone, setTimezone] = useState("Asia/Jakarta"),
    [language, setLanguage] = useState("id"),
    [message, setMessage] = useState(""),
    [currentPassword, setCurrent] = useState(""),
    [newPassword, setNew] = useState(""),
    [sessions, setSessions] = useState<
      {
        token: string;
        userAgent?: string | null;
        createdAt: Date;
        expiresAt: Date;
      }[]
    >([]);
  const router = useRouter();
  const { data: usage } = useAPI<{
    usage: {
      _count: number;
      _sum: { inputTokens: number; outputTokens: number };
    };
  }>("dashboard");
  useEffect(() => {
    authClient
      .listSessions()
      .then((r) => {
        if (r.data) setSessions(r.data);
      })
      .catch(() => {});
  }, [session]);
  return (
    <div>
      <PageHeader
        eyebrow="Your Workspace"
        title="Pengaturan"
        description="Buat HOLYAI terasa seperti ruang kerjamu sendiri."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Pengaturan">
          {tabs.map(([id, label]) => (
            <Link
              href={`/settings/${id}`}
              className={tab === id ? "active" : ""}
              key={id}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="settings-content">
          {message && <Alert>{message}</Alert>}
          {tab === "profile" && (
            <div className="stack">
              <section className="panel">
                <h2 style={{ marginBottom: 22 }}>Profil pribadi</h2>
                <Field label="Nama">
                  <input
                    value={name ?? session?.user.name ?? ""}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <input value={session?.user.email || ""} readOnly />
                </Field>
                <div className="options-grid">
                  <Field label="Zona waktu">
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      {[
                        "Asia/Jakarta",
                        "Asia/Makassar",
                        "Asia/Jayapura",
                        "Asia/Singapore",
                        "UTC",
                        "America/New_York",
                        "Europe/London",
                      ].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Bahasa hasil AI default">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                    </select>
                  </Field>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      const r = await authClient.updateUser({
                        name: name ?? session?.user.name,
                      });
                      if (r.error) throw new Error(r.error.message);
                      await api("/api/auth/update-user", {
                        method: "POST",
                        body: JSON.stringify({ timezone, language }),
                      });
                      setMessage("Profil tersimpan.");
                    } catch (e) {
                      setMessage((e as Error).message);
                    }
                  }}
                >
                  Simpan profil
                </Button>
              </section>
              <section className="panel">
                <h2 style={{ marginBottom: 20 }}>Ganti kata sandi</h2>
                <Field label="Kata sandi saat ini">
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrent(e.target.value)}
                  />
                </Field>
                <Field label="Kata sandi baru">
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={10}
                    value={newPassword}
                    onChange={(e) => setNew(e.target.value)}
                  />
                </Field>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const r = await authClient.changePassword({
                      currentPassword,
                      newPassword,
                      revokeOtherSessions: true,
                    });
                    setMessage(
                      r.error
                        ? r.error.message || "Perubahan gagal."
                        : "Kata sandi diperbarui dan sesi lain dicabut.",
                    );
                    setCurrent("");
                    setNew("");
                  }}
                >
                  Perbarui kata sandi
                </Button>
              </section>
              <section className="panel">
                <h2>Sesi aktif</h2>
                {sessions.map((s) => (
                  <div className="integration-row" key={s.token}>
                    <Icon name="Monitor" />
                    <div>
                      <h3>{s.userAgent?.slice(0, 80) || "Perangkat"}</h3>
                      <small>
                        Berakhir{" "}
                        {new Date(s.expiresAt).toLocaleDateString("id-ID")}
                      </small>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const r = await authClient.revokeSession({
                          token: s.token,
                        });
                        if (r.error)
                          setMessage(r.error.message || "Gagal mencabut sesi.");
                        else {
                          setSessions(
                            sessions.filter((x) => x.token !== s.token),
                          );
                          setMessage("Sesi dicabut.");
                        }
                      }}
                    >
                      Cabut
                    </Button>
                  </div>
                ))}
              </section>
            </div>
          )}
          {tab === "appearance" && (
            <section className="panel">
              <h2 style={{ marginBottom: 20 }}>Tema workspace</h2>
              <div className="options-grid">
                {[
                  { id: "light", label: "Terang", icon: "Sun" },
                  { id: "dark", label: "Gelap", icon: "Moon" },
                  { id: "system", label: "Sesuai perangkat", icon: "Monitor" },
                ].map((t) => (
                  <Button
                    variant={theme === t.id ? "default" : "secondary"}
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                  >
                    <Icon name={t.icon} size={17} />
                    {t.label}
                  </Button>
                ))}
              </div>
              <p style={{ marginTop: 20, fontSize: 12 }}>
                Tema tersimpan pada perangkat ini. Animasi mengikuti preferensi
                pengurangan gerak pada sistem.
              </p>
            </section>
          )}
          {tab === "integrations" && (
            <section className="panel">
              <h2>Integrasi & kemampuan</h2>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                Kredensial dikelola administrator melalui environment server.
                Kunci tidak dikirim ke browser.
              </p>
              {[
                {
                  name: "AI teks · OpenAI / Anthropic",
                  icon: "Sparkles",
                  active: caps?.text,
                  env: "OPENAI_API_KEY atau ANTHROPIC_API_KEY",
                  desc: "Chat, dokumen, belajar, dan analisis akademik.",
                },
                {
                  name: "Image & Video · OpenAI",
                  icon: "Image",
                  active: caps?.image,
                  env: "OPENAI_API_KEY, S3_*, REDIS_URL + worker",
                  desc: "Gambar asli dan video asynchronous. Akses model perlu diizinkan oleh akun provider.",
                },
                {
                  name: "Deep Search · Tavily",
                  icon: "Globe",
                  active: caps?.search,
                  env: "TAVILY_API_KEY + provider AI teks",
                  desc: "Pencarian publik dengan sumber dan tautan asli.",
                },
                {
                  name: "Academic Research · Crossref",
                  icon: "GraduationCap",
                  active: true,
                  env: "Tanpa API key; memerlukan akses internet",
                  desc: "Metadata judul, penulis, DOI, tahun dan abstrak jika tersedia.",
                },
                {
                  name: "Penyimpanan privat · S3",
                  icon: "HardDrive",
                  active: caps?.storage,
                  env: "S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION",
                  desc: "Aktifkan bucket privat, lifecycle, backup dan enkripsi pada penyedia storage.",
                },
                {
                  name: "Background jobs · Redis",
                  icon: "Workflow",
                  active: caps?.queue,
                  env: "REDIS_URL + npm run worker",
                  desc: "Status konfigurasi menunjukkan environment tersedia; bukan pemeriksaan koneksi langsung.",
                },
                {
                  name: "Email · Resend",
                  icon: "Mail",
                  active: caps?.email,
                  env: "RESEND_API_KEY, EMAIL_FROM",
                  desc: "Verifikasi email dan pemulihan kata sandi.",
                },
                {
                  name: "Canva",
                  icon: "Presentation",
                  active: caps?.canvaConnected,
                  env: "CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_REDIRECT_URI, TOKEN_ENCRYPTION_KEY",
                  desc: "OAuth PKCE resmi, impor PPTX dan ekspor asynchronous. Template autofill bergantung izin/paket dan belum diaktifkan.",
                },
              ].map((i) => (
                <div className="integration-row" key={i.name}>
                  <span className="tool-icon blue">
                    <Icon name={i.icon} />
                  </span>
                  <div>
                    <h3>{i.name}</h3>
                    <p>{i.desc}</p>
                    <code>{i.env}</code>
                    {i.name === "Canva" && (
                      <div style={{ marginTop: 12 }}>
                        {caps?.canvaConnected ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              await api("/api/integrations/canva/disconnect", {
                                method: "POST",
                                body: "{}",
                              });
                              window.location.reload();
                            }}
                          >
                            Putuskan koneksi
                          </Button>
                        ) : (
                          <a
                            className={`btn btn-secondary btn-sm ${!caps?.canva ? "disabled" : ""}`}
                            href={
                              caps?.canva
                                ? "/api/integrations/canva/connect"
                                : "#"
                            }
                            aria-disabled={!caps?.canva}
                          >
                            Hubungkan Canva{" "}
                            <Icon name="ExternalLink" size={13} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="badge">
                    {i.active ? "Dikonfigurasi" : "Requires Configuration"}
                  </span>
                </div>
              ))}
            </section>
          )}
          {tab === "usage" && (
            <section className="panel">
              <h2>Penggunaan AI</h2>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                Riwayat panggilan provider yang tercatat untuk akunmu.
              </p>
              <div
                className="results-stats"
                style={{ justifyContent: "flex-start" }}
              >
                <div>
                  <b>{usage?.usage._count || 0}</b>
                  <small>Panggilan tercatat</small>
                </div>
                <div>
                  <b>
                    {(usage?.usage._sum.inputTokens || 0).toLocaleString(
                      "id-ID",
                    )}
                  </b>
                  <small>Token input</small>
                </div>
                <div>
                  <b>
                    {(usage?.usage._sum.outputTokens || 0).toLocaleString(
                      "id-ID",
                    )}
                  </b>
                  <small>Token output</small>
                </div>
              </div>
              <Alert>
                Penggunaan bukan estimasi tagihan. Biaya aktual mengikuti
                penyedia AI dan model yang digunakan.
              </Alert>
            </section>
          )}
          {tab === "privacy" && (
            <section className="panel">
              <h2>Kamu memegang kendali.</h2>
              <p style={{ fontSize: 12, margin: "10px 0 23px" }}>
                Ekspor data pribadi atau hapus akun. File disimpan privat dan
                hanya diakses melalui tautan sementara. Materi yang diproses AI
                dikirim ke provider yang dikonfigurasi.
              </p>
              <a
                href="/api/workspace/privacy/me/export"
                download
                className="btn btn-secondary"
              >
                <Icon name="Download" size={17} />
                Ekspor data pribadi (JSON)
              </a>
              <h3 style={{ marginTop: 30 }}>Retensi data</h3>
              <p style={{ fontSize: 12, margin: "8px 0 22px" }}>
                Materi dan hasil disimpan sampai kamu menghapusnya. Token
                otorisasi sementara dibersihkan setelah kedaluwarsa. Cadangan
                mengikuti kebijakan administrator; lihat petunjuk deployment
                untuk penghapusan backup dan retensi audit.
              </p>
              <Modal
                title="Hapus akun secara permanen"
                trigger={
                  <Button variant="danger">
                    <Icon name="Trash2" size={16} />
                    Hapus akun
                  </Button>
                }
              >
                <DeleteAccount onDeleted={() => router.push("/")} />
              </Modal>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState("");
  return (
    <div className="stack">
      <p>
        Akun, percakapan, tugas, dan hasil akan dihapus. Unduh data yang ingin
        disimpan terlebih dahulu.
      </p>
      <Field label="Kata sandi">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Ketik HAPUS untuk melanjutkan">
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </Field>
      {error && <Alert error>{error}</Alert>}
      <Button
        variant="danger"
        disabled={confirmation !== "HAPUS"}
        onClick={async () => {
          const r = await authClient.deleteUser({ password });
          if (r.error) setError(r.error.message || "Akun belum dapat dihapus.");
          else onDeleted();
        }}
      >
        Hapus akun saya
      </Button>
    </div>
  );
}
