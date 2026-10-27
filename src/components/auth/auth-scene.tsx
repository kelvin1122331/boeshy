"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon, Logo } from "@/components/common";

const navigation = [
  { href: "/", label: "Beranda" },
  { href: "/features", label: "Fitur" },
  { href: "/how-it-works", label: "Tentang" },
  { href: "/help", label: "Bantuan" },
];
const possibilities = [
  {
    icon: "MessagesSquare",
    title: "AI Chat",
    text: "Temukan jawaban dan ide baru",
    href: "/chat",
  },
  {
    icon: "BookOpen",
    title: "Belajar",
    text: "Materi, ringkasan, dan latihan soal",
    href: "/study-exam",
  },
  {
    icon: "Image",
    title: "Buat Konten",
    text: "Gambar, video, dan presentasi",
    href: "/features?category=AI%20Creation",
  },
  {
    icon: "LayoutGrid",
    title: "Lebih Banyak",
    text: "Jelajahi semua alat dalam satu ruang",
    href: "/features",
  },
];

export function AuthScene({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="cosmos-auth">
      <div className="cosmos-background" aria-hidden="true">
        <Image
          src="/marketing/holyai-orbit-auth.webp"
          alt=""
          fill
          preload
          sizes="100vw"
        />
      </div>
      <header className="cosmos-header">
        <Logo href="/" />
        <nav className="cosmos-desktop-nav" aria-label="Navigasi HOLYAI">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="cosmos-header-actions">
          <span className="cosmos-language" aria-label="Bahasa Indonesia">
            <Icon name="Globe" size={23} />
            ID
          </span>
          <Link
            className="cosmos-header-login"
            href="/login"
            aria-current={mode === "login" ? "page" : undefined}
          >
            Masuk
          </Link>
          <button
            className="cosmos-menu-toggle"
            type="button"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
            aria-controls="cosmos-mobile-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "X" : "Menu"} />
          </button>
        </div>
        {menuOpen && (
          <nav
            id="cosmos-mobile-nav"
            className="cosmos-mobile-nav"
            aria-label="Navigasi seluler HOLYAI"
          >
            {navigation.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
                <Icon name="ArrowUpRight" size={16} />
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main id="main-content" className="cosmos-main">
        <aside className="cosmos-story" aria-label="Kemungkinan bersama HOLYAI">
          <span className="cosmos-eyebrow">YOUR SPACE TO GO FURTHER</span>
          <h2>
            Satu
            <br />
            kecerdasan.
            <br />
            <span>
              Kemungkinan
              <br />
              tanpa batas.
            </span>
          </h2>
          <p>
            Belajar lebih dalam. Ciptakan lebih banyak.
            <br className="cosmos-desktop-break" /> Temukan jawaban. Semuanya
            dimulai
            <br className="cosmos-desktop-break" /> dari satu ruang bersama
            HOLYAI.
          </p>
          <nav
            className="cosmos-possibilities"
            aria-label="Jelajahi kemampuan HOLYAI"
          >
            {possibilities.map((item) => (
              <Link href={item.href} key={item.title}>
                <span>
                  <Icon name={item.icon} size={28} />
                </span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </Link>
            ))}
          </nav>
        </aside>
        <section
          className={`cosmos-panel cosmos-panel-${mode}`}
          aria-labelledby="auth-title"
        >
          {children}
        </section>
      </main>
      <footer className="cosmos-footer">
        <span>HOLYAI · One Intelligence. Endless Possibilities.</span>
        <span>
          “EXPLORE IDEAS.
          <br />
          BEYOND LIMITS.”
        </span>
      </footer>
    </div>
  );
}
