"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth/client";
import { Alert, Icon } from "@/components/common";
import { Button } from "@/components/ui/button";
import { AuthScene } from "./auth-scene";

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
  const params = useSearchParams();
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  const accountMode = mode === "login" || mode === "register";
  const descriptions = {
    login: "Masuk dan lanjutkan langkahmu bersama HOLYAI.",
    register: "Buat akun dan mulai langkah pertamamu bersama HOLYAI.",
    "forgot-password": "Kami akan mengirim tautan pemulihan ke emailmu.",
    "reset-password": "Gunakan minimal 10 karakter untuk melindungi akunmu.",
  };
  async function signInWithGoogle() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
      if (result.error)
        throw new Error(
          result.error.message || "Belum bisa masuk dengan Google. Coba lagi.",
        );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthScene mode={mode}>
      <Link className="cosmos-back" href="/">
        <Icon name="ArrowLeft" size={17} />
        Kembali ke HOLYAI
      </Link>
      <div className="cosmos-panel-heading">
        <h1 id="auth-title">
          {accountMode ? (
            <>
              Ruang untuk
              <br />
              <span>kemungkinan baru.</span>
            </>
          ) : mode === "forgot-password" ? (
            <>
              Lupa
              <br />
              <span>kata sandimu?</span>
            </>
          ) : (
            <>
              Saatnya membuat
              <br />
              <span>kata sandi baru.</span>
            </>
          )}
        </h1>
        <p>{descriptions[mode]}</p>
      </div>
      {error && <Alert error>{error}</Alert>}
      {message && <Alert>{message}</Alert>}
      {(mode === "forgot-password" || mode === "register") &&
        !emailConfigured && (
          <div className="cosmos-email-notice" role="status">
            <Icon name="Info" size={26} />
            <p>
              {mode === "forgot-password"
                ? "Pemulihan akun lewat email belum tersedia saat ini. Silakan coba lagi nanti."
                : "Pengiriman email belum tersedia saat ini. Akun yang memerlukan verifikasi email belum bisa melanjutkan."}
            </p>
          </div>
        )}
      <form
        className="cosmos-form"
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
              if (r.data?.token) window.location.assign("/dashboard");
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
              window.location.assign("/dashboard");
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
          <div className="cosmos-field">
            <label htmlFor="auth-name">Nama lengkap</label>
            <div className="cosmos-input">
              <Icon name="UserRound" size={23} />
              <input
                id="auth-name"
                autoComplete="name"
                required
                {...register("name")}
                placeholder="Nama kamu"
              />
            </div>
          </div>
        )}
        {mode !== "reset-password" && (
          <div className="cosmos-field">
            <label htmlFor="auth-email">Alamat email</label>
            <div className="cosmos-input">
              <Icon name="Mail" size={23} />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                {...register("email")}
                placeholder="nama@email.com"
              />
            </div>
          </div>
        )}
        {mode !== "forgot-password" && (
          <div className="cosmos-field">
            <label htmlFor="auth-password">Kata sandi</label>
            <div className="cosmos-input cosmos-password">
              <Icon name="LockKeyhole" size={23} />
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
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
              <button
                type="button"
                className="cosmos-password-toggle"
                aria-label={
                  showPassword
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? "Eye" : "EyeOff"} size={20} />
              </button>
            </div>
          </div>
        )}
        {mode === "login" && (
          <div className="cosmos-forgot">
            <Link href="/forgot-password">Lupa kata sandi?</Link>
          </div>
        )}
        <Button
          className="cosmos-submit"
          disabled={busy || (mode === "forgot-password" && !emailConfigured)}
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
          <Icon name={busy ? "LoaderCircle" : "ArrowRight"} size={18} />
        </Button>
      </form>
      <p className="cosmos-account-switch">
        {mode === "login" ? (
          <>
            Belum punya akun? <Link href="/register">Buat akun</Link>
          </>
        ) : (
          <>
            Sudah punya akun? <Link href="/login">Masuk</Link>
          </>
        )}
      </p>
      {accountMode && (
        <div className="cosmos-social">
          <div className="cosmos-separator">atau lanjut dengan</div>
          <div className="cosmos-social-buttons">
            <button
              type="button"
              disabled={!googleConfigured || busy}
              onClick={() => void signInWithGoogle()}
              title={
                googleConfigured
                  ? "Lanjutkan dengan Google"
                  : "Login Google belum tersedia"
              }
              aria-describedby={!googleConfigured ? "social-status" : undefined}
            >
              <span className="cosmos-google-mark" aria-hidden="true">
                G
              </span>
              Google
            </button>
            <button
              type="button"
              disabled
              title="Login Microsoft belum tersedia"
              aria-describedby="social-status"
            >
              <span className="cosmos-microsoft-mark" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              Microsoft
            </button>
            <button
              type="button"
              disabled
              title="Login Apple belum tersedia"
              aria-describedby="social-status"
            >
              <svg
                aria-hidden="true"
                width="21"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.1 12.5c0-2.1 1.7-3.2 1.8-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8C8 7.5 6.6 8.4 5.8 9.7c-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1.1 2.7-2.2.8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.7ZM14.9 6.1c.6-.8 1.1-1.8 1-2.9-.9.1-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3Z" />
              </svg>
              Apple
            </button>
          </div>
          <p className="cosmos-social-status" id="social-status">
            {googleConfigured
              ? "Microsoft dan Apple belum tersedia."
              : "Login sosial belum tersedia. Gunakan email untuk melanjutkan."}
          </p>
        </div>
      )}
      <p className="cosmos-terms">
        Dengan melanjutkan, kamu setuju menggunakan HOLYAI
        <br className="cosmos-desktop-break" /> secara bertanggung jawab.{" "}
        <Link href="/privacy">Pelajari privasi.</Link>
      </p>
    </AuthScene>
  );
}
