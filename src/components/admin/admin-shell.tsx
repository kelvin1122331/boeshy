"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Icon, Logo } from "@/components/common";
import { adminSections } from "@/config/admin";
import { hasPermission, type Permission } from "@/lib/permissions";
import { adminRequest, Notice } from "./shared";
export function sectionPermission(id: string): Permission {
  return ["users", "roles"].includes(id)
    ? "users.read"
    : [
          "ai-providers",
          "api-credentials",
          "models",
          "ai-routing",
          "features",
        ].includes(id) || id.startsWith("integrations/")
      ? "providers.read"
      : ["settings", "security", "notifications"].includes(id)
        ? "admin.read"
        : "monitoring.read";
}
export function AdminShell({
  children,
  user,
  mfaRequired,
}: {
  children: React.ReactNode;
  user: { name: string; role: string };
  mfaRequired: boolean;
}) {
  const path = usePathname(),
    current = adminSections.find((s) => path === `/admin/${s.id}`);
  const [open, setOpen] = useState(false),
    [filter, setFilter] = useState(""),
    [challenge, setChallenge] = useState(mfaRequired),
    [code, setCode] = useState(""),
    [error, setError] = useState("");
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    const listener = () => setChallenge(true);
    window.addEventListener("admin-mfa-required", listener);
    return () => window.removeEventListener("admin-mfa-required", listener);
  }, []);
  const allowed = adminSections.filter((item) =>
    hasPermission(user.role, sectionPermission(item.id)),
  );
  return (
    <div className="acc-shell">
      {open && (
        <button
          className="acc-scrim"
          aria-label="Tutup navigasi admin"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`acc-sidebar${open ? " acc-sidebar-open" : ""}`}>
        <div className="acc-brand">
          <Logo href="/admin/overview" />
          <span>ADMIN CONTROL CENTER</span>
        </div>
        <label className="acc-nav-search">
          <Icon name="Search" size={16} />
          <input
            aria-label="Cari menu admin"
            placeholder="Cari menu…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <nav aria-label="Navigasi admin">
          {allowed
            .filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))
            .map((item, index, list) => (
              <div key={item.id}>
                {item.group &&
                  (index === 0 || list[index - 1].group !== item.group) && (
                    <span className="acc-nav-group">{item.group}</span>
                  )}
                <Link
                  href={`/admin/${item.id}`}
                  aria-current={current?.id === item.id ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.name}</span>
                </Link>
              </div>
            ))}
        </nav>
        <div className="acc-sidebar-bottom">
          <Link href="/dashboard">
            <Icon name="ArrowLeft" size={16} />
            Kembali ke workspace
          </Link>
          <div>
            <span className="avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.role.replaceAll("_", " ")}</small>
            </span>
            <Icon name="ShieldCheck" size={19} />
          </div>
        </div>
      </aside>
      <div className="acc-main">
        <header className="acc-topbar">
          <div>
            <button
              className="acc-menu"
              aria-label="Buka navigasi admin"
              onClick={() => setOpen(true)}
            >
              <Icon name="Menu" />
            </button>
            <span>Admin</span>
            <Icon name="ChevronRight" size={14} />
            <strong>{current?.name || "Control Center"}</strong>
          </div>
          <div>
            <span className="acc-role">
              <Icon name="ShieldCheck" size={14} />
              {user.role.replaceAll("_", " ")}
            </span>
            <button
              aria-label="Ganti tema admin"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Icon
                name={resolvedTheme === "dark" ? "Sun" : "Moon"}
                size={19}
              />
            </button>
          </div>
        </header>
        <main id="main-content" className="acc-content">
          {challenge ? (
            <div className="acc-challenge">
              <Icon name="ShieldCheck" size={35} />
              <h1>Verifikasi akses admin</h1>
              <p>
                Masukkan kode authenticator atau recovery code untuk
                melanjutkan. Verifikasi berlaku 10 menit pada sesi ini.
              </p>
              {error && <Notice error>{error}</Notice>}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await adminRequest("security/mfa-verify", { code });
                    setChallenge(false);
                    setCode("");
                    setError("");
                  } catch (error) {
                    setError((error as Error).message);
                  }
                }}
              >
                <label>
                  Kode MFA
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="one-time-code"
                    required
                    maxLength={30}
                  />
                </label>
                <button className="btn btn-primary">Verifikasi</button>
              </form>
            </div>
          ) : (
            children
          )}
        </main>
        <footer className="acc-footer">
          <span>HOLYAI · Admin Control Center</span>
          <span>
            <Icon name="LockKeyhole" size={12} />
            Server-side access control
          </span>
        </footer>
      </div>
    </div>
  );
}
