"use client";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import * as Dialog from "@radix-ui/react-dialog";
import { features, categories } from "@/config/features";
import { authClient } from "@/lib/auth/client";
import { Icon, Logo, Modal } from "@/components/common";
import { Button } from "@/components/ui/button";
import { api, useAPI } from "@/hooks/use-api";
type SearchResult = {
  items: { id: string; kind: string; title: string }[];
  projects: { id: string; title: string }[];
  conversations: { id: string; title: string }[];
  tasks: { id: string; title: string }[];
};
export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role?: string };
}) {
  const path = usePathname(),
    router = useRouter();
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(false),
    [searchText, setSearchText] = useState(""),
    [results, setResults] = useState<SearchResult | null>(null);
  const [orbitLight, setOrbitLight] = useState(false);
  const isDashboard = path === "/dashboard";
  const { theme, setTheme } = useTheme();
  const { data: notifications } = useAPI<{ id: string; read: boolean }[]>(
    "notifications",
    30000,
  );
  const { data: featureAvailability } = useAPI<{
    featureStatus: Record<string, { enabled: boolean }>;
  }>("capabilities");
  const current = features.find((f) => path.startsWith(`/${f.id}`));
  const label =
    current?.name ||
    (
      {
        dashboard: "Dashboard",
        projects: "Proyek",
        history: "Riwayat",
        notifications: "Notifikasi",
        settings: "Pengaturan",
        admin: "Administrator",
      } as Record<string, string>
    )[path.split("/")[1]] ||
    "Workspace";
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!searchText) {
      return;
    }
    const abort = new AbortController();
    const timer = setTimeout(
      () =>
        api<SearchResult>(`search?q=${encodeURIComponent(searchText)}`, {
          signal: abort.signal,
        })
          .then(setResults)
          .catch(() => {}),
      250,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [searchText]);
  function go(href: string) {
    router.push(href);
    setSearch(false);
    setMobile(false);
  }
  return (
    <div
      className={`app-shell ${collapsed ? "collapsed" : ""}${isDashboard ? " dashboard-orbit" : ""}`}
      data-orbit-theme={
        isDashboard ? (orbitLight ? "light" : "dark") : undefined
      }
    >
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Tutup navigasi"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Logo small={collapsed} />
          <button
            className="collapse-button"
            aria-label={collapsed ? "Perluas navigasi" : "Ringkas navigasi"}
            onClick={() => setCollapsed(!collapsed)}
          >
            <Icon name="PanelLeftClose" size={17} />
          </button>
        </div>
        <button className="sidebar-search" onClick={() => setSearch(true)}>
          <Icon name="Search" size={17} />
          <span>Cari apa saja</span>
          <kbd>⌘ K</kbd>
        </button>
        <Link
          href="/dashboard"
          onClick={() => setMobile(false)}
          className={`nav-link dashboard-link ${path === "/dashboard" ? "active" : ""}`}
          title="Dashboard"
        >
          <Icon name="LayoutDashboard" />
          <span>Dashboard</span>
        </Link>
        {!collapsed && (
          <input
            className="feature-filter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter fitur…"
            aria-label="Filter fitur"
          />
        )}
        <nav className="feature-nav" aria-label="Fitur HOLYAI">
          {categories.map((category) => (
            <div className="nav-group" key={category}>
              <div className="nav-label">{category}</div>
              {features
                .filter(
                  (f) =>
                    f.category === category &&
                    f.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((f) => (
                  <Link
                    href={`/${f.id}`}
                    key={f.id}
                    onClick={() => setMobile(false)}
                    title={f.name}
                    className={`nav-link ${current?.id === f.id ? "active" : ""}`}
                  >
                    <Icon name={f.icon} size={18} />
                    <span>{f.name}</span>
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {hasPermission(user.role || "user", "admin.read") && (
            <Link
              className="nav-link"
              href="/admin/overview"
              title="Admin Control Center"
            >
              <Icon name="ShieldCheck" size={18} />
              <span>Admin Control Center</span>
            </Link>
          )}
          <Link
            className={`nav-link ${path.startsWith("/projects") ? "active" : ""}`}
            href="/projects"
            title="Proyek"
          >
            <Icon name="Folders" size={18} />
            <span>Proyek saya</span>
          </Link>
          <Link className="nav-link" href="/history" title="Riwayat">
            <Icon name="History" size={18} />
            <span>Riwayat aktivitas</span>
          </Link>
          <Link className="nav-link" href="/settings" title="Pengaturan">
            <Icon name="Settings2" size={18} />
            <span>Pengaturan</span>
          </Link>
          <Link
            href="/settings/profile"
            className="user-card"
            title={user.name}
          >
            <span className="avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <b>{user.name}</b>
              <small>Personal workspace</small>
            </span>
            <Icon name="ChevronsUpDown" size={15} />
          </Link>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu btn-ghost"
              aria-label="Buka navigasi"
              onClick={() => setMobile(true)}
            >
              <Icon name="Menu" />
            </button>
            <span>Workspace</span>
            <Icon name="ChevronRight" size={13} />
            <b>{label}</b>
          </div>
          <div className="topbar-actions">
            <span className="workspace-label">
              <span className="status-dot" />
              Personal workspace
            </span>
            <button
              aria-label="Pencarian global"
              onClick={() => setSearch(true)}
            >
              <Icon name="Search" size={19} />
            </button>
            <Link
              href="/notifications"
              aria-label="Notifikasi"
              className="notification-icon"
            >
              <Icon name="Bell" size={19} />
              {notifications?.some((n) => !n.read) && <i />}
            </Link>
            <button
              aria-label="Ganti tema"
              aria-pressed={isDashboard ? !orbitLight : theme === "dark"}
              onClick={() =>
                isDashboard
                  ? setOrbitLight(!orbitLight)
                  : setTheme(theme === "dark" ? "light" : "dark")
              }
            >
              <Icon
                name={
                  (isDashboard ? !orbitLight : theme === "dark")
                    ? "Sun"
                    : "Moon"
                }
                size={18}
              />
            </button>
            <Modal
              title="Akun kamu"
              trigger={
                <button className="avatar avatar-sm" aria-label="Menu akun">
                  {user.name[0].toUpperCase()}
                </button>
              }
            >
              <div className="stack">
                <b>{user.name}</b>
                <p>{user.email}</p>
                <Button
                  variant="secondary"
                  onClick={() => go("/settings/profile")}
                >
                  Pengaturan profil
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    await authClient.signOut();
                    router.push("/login");
                  }}
                >
                  Keluar
                </Button>
              </div>
            </Modal>
          </div>
        </header>
        <main className="main-content" id="main-content">
          {current &&
          featureAvailability?.featureStatus[current.id]?.enabled === false ? (
            <section className="panel">
              <h1>Fitur sedang dinonaktifkan</h1>
              <p>
                Administrator menonaktifkan {current.name}. Karya yang sudah
                disimpan tetap tersedia di Riwayat.
              </p>
              {hasPermission(user.role || "user", "features.write") && (
                <Link className="btn btn-secondary" href="/admin/features">
                  Buka Feature Management
                </Link>
              )}
            </section>
          ) : (
            children
          )}
        </main>
        <footer className="app-footer">
          <span>HOLYAI · One Intelligence. Endless Possibilities.</span>
          <Link href="/settings/integrations">
            Status integrasi <Icon name="ArrowUpRight" size={13} />
          </Link>
        </footer>
      </div>
      <Dialog.Root open={search} onOpenChange={setSearch}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content
            className="modal-content search-dialog"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Pencarian global</Dialog.Title>
            <div className="search-box">
              <Icon name="Search" />
              <input
                autoFocus
                placeholder="Cari fitur, dokumen, proyek, dan percakapan…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Dialog.Close aria-label="Tutup">
                <Icon name="X" />
              </Dialog.Close>
            </div>
            <div className="search-results">
              <div className="eyebrow">Fitur</div>
              {features
                .filter((f) =>
                  f.name.toLowerCase().includes(searchText.toLowerCase()),
                )
                .map((f) => (
                  <button key={f.id} onClick={() => go(`/${f.id}`)}>
                    <Icon name={f.icon} />
                    <span>{f.name}</span>
                    <Icon name="ArrowUpRight" size={15} />
                  </button>
                ))}
              {results &&
                searchText &&
                [
                  ...results.items.map((i) => ({
                    ...i,
                    href: `/${i.kind}?item=${i.id}`,
                  })),
                  ...results.projects.map((i) => ({
                    ...i,
                    href: `/projects/${i.id}`,
                  })),
                  ...results.conversations.map((i) => ({
                    ...i,
                    href: `/chat/${i.id}`,
                  })),
                  ...results.tasks.map((i) => ({
                    ...i,
                    href: "/task-manager",
                  })),
                ].map((i) => (
                  <button key={i.id} onClick={() => go(i.href)}>
                    <Icon name="FileText" />
                    <span>{i.title}</span>
                  </button>
                ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
