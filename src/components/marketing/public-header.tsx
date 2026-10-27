"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Logo, Icon } from "@/components/common";
const links = [
  { href: "/features", label: "Kemampuan" },
  { href: "/how-it-works", label: "Cara kerja" },
  { href: "/privacy", label: "Privasi" },
];
export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <header className="marketing-header">
      <div className="marketing-header-inner">
        <Logo href="/" />
        <nav aria-label="Navigasi utama" className="marketing-desktop-nav">
          {links.map((l) => (
            <Link
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              key={l.href}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="marketing-header-actions">
          <button
            className="marketing-theme"
            aria-label="Ganti tema"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Icon name="SunMoon" size={19} />
          </button>
          <Link className="marketing-login" href="/login">
            Masuk
          </Link>
          <Link className="btn btn-primary marketing-start" href="/register">
            Mulai sekarang <Icon name="ArrowUpRight" size={15} />
          </Link>
          <button
            className="marketing-menu-toggle"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="marketing-mobile-menu"
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "X" : "Menu"} />
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="marketing-mobile-menu"
          className="marketing-mobile-nav"
          aria-label="Navigasi seluler"
        >
          <Link href="/" onClick={() => setOpen(false)}>
            Beranda
          </Link>
          {links.map((l) => (
            <Link
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              onClick={() => setOpen(false)}
              key={l.href}
            >
              {l.label}
              <Icon name="ArrowUpRight" size={16} />
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Masuk ke workspace <Icon name="LogIn" size={16} />
          </Link>
        </nav>
      )}
    </header>
  );
}
