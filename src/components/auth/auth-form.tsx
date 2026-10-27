"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";
import { Field, Alert, Logo, Icon } from "@/components/common";
import { Button } from "@/components/ui/button";
const schema = z.object({
  name: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  password: z.string().optional(),
});
export function AuthForm({
  mode,
  emailConfigured,
  googleConfigured,
}: {
  mode: "login" | "register" | "forgot-password" | "reset-password";
  emailConfigured: boolean;
  googleConfigured: boolean;
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const { register, handleSubmit } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  const titles = {
    login: "Selamat datang kembali.",
    register: "Ruang untuk kemungkinan baru.",
    "forgot-password": "Lupa kata sandi?",
    "reset-password": "Kata sandi baru.",
  };
  const descriptions = {
    login: "Masuk dan lanjutkan hal yang ingin kamu wujudkan.",
    register: "Buat akun dan mulai langkah pertamamu bersama HOLYAI.",
    "forgot-password": "Kami akan mengirim tautan pemulihan ke emailmu.",
    "reset-password": "Gunakan minimal 10 karakter untuk melindungi akunmu.",
  };
  return (
    <div className="auth-layout">
      <aside className="auth-brand">
        <Logo />
        <div>
          <div className="eyebrow" style={{ color: "#93b4fc" }}>
            YOUR SPACE TO GO FURTHER
          </div>
          <h1>
            Satu kecerdasan.
            <br />
            Kemungkinan tanpa batas.
          </h1>
          <p>
            Belajar lebih dalam. Ciptakan lebih banyak. Temukan jawaban.
            Semuanya dimulai dari satu ruang.
          </p>
        </div>
        <small>HOLYAI · One Intelligence. Endless Possibilities.</small>
      </aside>
      <main id="main-content" className="auth-form-wrap">
        <div className="auth-form">
          <Link className="back-link" href="/">
            <Icon name="ArrowLeft" size={14} />
            Kembali ke HOLYAI
          </Link>
          <h1>{titles[mode]}</h1>
          <p>{descriptions[mode]}</p>
          {error && <Alert error>{error}</Alert>}
          {message && <Alert>{message}</Alert>}
          {(mode === "forgot-password" || mode === "register") &&
            !emailConfigured && (
              <Alert>
                Layanan email belum dikonfigurasi.{" "}
                {mode === "forgot-password"
                  ? "Pemulihan akun memerlukan konfigurasi email."
                  : "Verifikasi email memerlukan konfigurasi server; mode pengembangan dapat menonaktifkannya."}
              </Alert>
            )}
          <form
            onSubmit={handleSubmit(async (values) => {
              setError("");
              setMessage("");
              setBusy(true);
              try {
                if (mode === "register") {
                  if (!values.name?.trim())
                    throw new Error("Masukkan nama lengkap.");
                  if ((values.password || "").length < 10)
                    throw new Error("Kata sandi minimal 10 karakter.");
                  const r = await authClient.signUp.email({
                    name: values.name,
                    email: values.email!,
                    password: values.password!,
                    callbackURL: "/dashboard",
                  });
                  if (r.error) throw new Error(r.error.message);
                  if (r.data?.token) router.push("/dashboard");
                  else
                    setMessage(
                      "Akun dibuat. Periksa email untuk verifikasi, lalu masuk.",
                    );
                } else if (mode === "login") {
                  const r = await authClient.signIn.email({
                    email: values.email!,
                    password: values.password!,
                  });
                  if (r.error)
                    throw new Error(
                      "Email, kata sandi, atau status verifikasi belum sesuai.",
                    );
                  router.push("/dashboard");
                  router.refresh();
                } else if (mode === "forgot-password") {
                  const r = await authClient.requestPasswordReset({
                    email: values.email!,
                    redirectTo: "/reset-password",
                  });
                  if (r.error) throw new Error(r.error.message);
                  setMessage(
                    "Jika akun terdaftar, tautan pemulihan akan dikirim ke email tersebut.",
                  );
                } else {
                  const token = params.get("token");
                  if (!token) throw new Error("Tautan pemulihan tidak valid.");
                  const r = await authClient.resetPassword({
                    newPassword: values.password!,
                    token,
                  });
                  if (r.error) throw new Error(r.error.message);
                  setMessage("Kata sandi diperbarui. Kamu bisa masuk kembali.");
                }
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            })}
          >
            {mode === "register" && (
              <Field label="Nama lengkap">
                <input
                  autoComplete="name"
                  required
                  {...register("name")}
                  placeholder="Nama kamu"
                />
              </Field>
            )}
            {mode !== "reset-password" && (
              <Field label="Alamat email">
                <input
                  type="email"
                  autoComplete="email"
                  required
                  {...register("email")}
                  placeholder="nama@email.com"
                />
              </Field>
            )}
            {mode !== "forgot-password" && (
              <Field label="Kata sandi">
                <input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={mode === "login" ? 1 : 10}
                  required
                  {...register("password")}
                  placeholder={
                    mode === "login"
                      ? "Masukkan kata sandi"
                      : "Minimal 10 karakter"
                  }
                />
              </Field>
            )}
            {mode === "login" && (
              <div
                style={{
                  textAlign: "right",
                  fontSize: 11,
                  margin: "-5px 0 20px",
                }}
              >
                <Link href="/forgot-password">Lupa kata sandi?</Link>
              </div>
            )}
            <Button
              disabled={
                busy || (mode === "forgot-password" && !emailConfigured)
              }
              type="submit"
            >
              {busy
                ? "Memproses…"
                : mode === "login"
                  ? "Masuk ke workspace"
                  : mode === "register"
                    ? "Buat akun"
                    : mode === "forgot-password"
                      ? "Kirim tautan pemulihan"
                      : "Simpan kata sandi"}
              <Icon name="ArrowRight" size={15} />
            </Button>
          </form>
          {googleConfigured && (mode === "login" || mode === "register") && (
            <>
              <div className="auth-separator">atau</div>
              <Button
                variant="secondary"
                onClick={() =>
                  void authClient.signIn.social({
                    provider: "google",
                    callbackURL: "/dashboard",
                  })
                }
              >
                Lanjutkan dengan Google
              </Button>
            </>
          )}
          <small>
            {mode === "login" ? (
              <>
                Belum punya akun? <Link href="/register">Buat akun</Link>
              </>
            ) : (
              <>
                Sudah punya akun? <Link href="/login">Masuk</Link>
              </>
            )}
          </small>
          <small>
            Dengan melanjutkan, kamu setuju menggunakan HOLYAI secara
            bertanggung jawab.
          </small>
        </div>
      </main>
    </div>
  );
}
