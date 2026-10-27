"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Logo, Icon } from "@/components/common";
import { PublicSearch } from "./public-search";
const links = [
  { href: "/", label: "Beranda" },
  { href: "/features", label: "Fitur" },
  { href: "/how-it-works", label: "Cara kerja" },
  { href: "/privacy", label: "Privasi" },
  { href: "/help", label: "Bantuan" },
];
export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [homeDark, setHomeDark] = useState(true);
  const isHome = pathname === "/";
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <header
      className={`marketing-header${isHome ? " showcase-header" : ""}`}
      data-home-theme={isHome ? (homeDark ? "dark" : "light") : undefined}
    >
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
          {isHome && <PublicSearch dark={homeDark} />}
          <button
            className="marketing-theme"
            aria-label="Ganti tema"
            aria-pressed={isHome ? homeDark : resolvedTheme === "dark"}
            onClick={() =>
              isHome
                ? setHomeDark(!homeDark)
                : setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Icon name="Sun" size={21} />
          </button>
          <Link className="marketing-login" href="/login">
            Masuk
          </Link>
          <Link className="btn btn-primary marketing-start" href="/register">
            Mulai sekarang <Icon name="ArrowRight" size={15} />
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
