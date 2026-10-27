import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Icon } from "@/components/common";
import { features, categories } from "@/config/features";
import "./home.css";

export const metadata: Metadata = {
  title: "HOLYAI — Satu AI untuk Semua Kemungkinan",
  description:
    "Workspace AI terpadu untuk belajar, bekerja, berkreasi, dan melakukan riset. Jelajahi 18 alat HOLYAI dalam satu tempat.",
};

const quickTools = [
  {
    id: "chat",
    name: "Chat AI",
    description: "Tanya jawab & ide",
    icon: "MessageCircle",
    color: "blue",
  },
  {
    id: "image-generator",
    name: "Generate Gambar",
    description: "Dari ide jadi visual",
    icon: "Image",
    color: "violet",
  },
  {
    id: "video-generator",
    name: "Generate Video",
    description: "Ceritakan idemu",
    icon: "Video",
    color: "rose",
  },
  {
    id: "presentation-studio",
    name: "Presentasi AI",
    description: "Susun draft slide",
    icon: "Presentation",
    color: "orange",
  },
  {
    id: "deep-search",
    name: "Riset Mendalam",
    description: "Telusuri sumber",
    icon: "Search",
    color: "blue",
  },
  {
    id: "notes-summarizer",
    name: "Analisis Dokumen",
    description: "Temukan inti materi",
    icon: "FileText",
    color: "sky",
  },
  {
    id: "book-creator",
    name: "Buku Online",
    description: "Bangun bab demi bab",
    icon: "BookOpen",
    color: "violet",
  },
  {
    id: "study-exam",
    name: "Ujian & Latihan",
    description: "Belajar lebih aktif",
    icon: "ClipboardCheck",
    color: "blue",
  },
];
const highlights = [
  {
    id: "chat",
    title: "Chat AI",
    text: "Tanya jawab, ide, penulisan, dan banyak lagi.",
    art: "panda",
  },
  {
    id: "image-generator",
    title: "Generate Gambar",
    text: "Wujudkan visual dari deskripsi dan imajinasimu.",
    art: "mountain",
  },
  {
    id: "video-generator",
    title: "Generate Video",
    text: "Mulai cerita bergerak dari ide dan sebuah brief.",
    art: "astronaut",
  },
  {
    id: "presentation-studio",
    title: "Presentasi AI",
    text: "Susun outline, draft slide, dan catatan pembicara.",
    art: "presentation",
  },
  {
    id: "book-creator",
    title: "Buku Online",
    text: "Kembangkan ide menjadi bab yang terstruktur.",
    art: "city",
  },
  {
    id: "deep-search",
    title: "Riset Mendalam",
    text: "Temukan informasi dan telusuri sumber aslinya.",
    art: "earth",
  },
];
const benefits = [
  {
    icon: "Zap",
    title: "Alur Terarah",
    text: "Alat yang sesuai untuk setiap kebutuhan.",
    href: "/how-it-works",
  },
  {
    icon: "ShieldCheck",
    title: "Privasi yang Jelas",
    text: "Kenali bagaimana datamu diproses.",
    href: "/privacy",
  },
  {
    icon: "Layers",
    title: "Satu Workspace",
    text: "Belajar, berkarya, dan riset bersama.",
    href: "/features",
  },
  {
    icon: "FolderOpen",
    title: "Lanjutkan Karyamu",
    text: "Kelola hasil dan ide dalam proyek.",
    href: "/projects",
  },
];

export default function Home() {
  return (
    <div className="showcase-home">
      <section className="showcase-hero" aria-labelledby="home-title">
        <figure className="showcase-hero-visual">
          <Image
            src="/marketing/holyai-orbit-home.webp"
            alt="Ilustrasi workspace HOLYAI dan panda berkacamata biru di stasiun luar angkasa dengan pemandangan bumi."
            fill
            preload
            sizes="100vw"
          />
          <figcaption>Ilustrasi workspace HOLYAI</figcaption>
        </figure>
        <div className="showcase-hero-inner">
          <div className="showcase-hero-copy">
            <span className="showcase-badge">
              <Icon name="Sparkles" size={15} />
              AI Terpadu untuk Semua Kebutuhan
            </span>
            <h1 id="home-title">
              Satu AI
              <br />
              Untuk Semua
              <br />
              <span>Kemungkinan.</span>
            </h1>
            <p>
              HOLYAI adalah workspace AI terpadu untuk belajar, bekerja,
              berkreasi, dan melakukan riset — semuanya dalam satu tempat yang
              simpel dan powerful.
            </p>
            <div className="showcase-hero-actions">
              <Link className="showcase-primary" href="/register">
                Mulai Sekarang <Icon name="ArrowRight" size={18} />
              </Link>
              <Link className="showcase-secondary" href="/how-it-works">
                <Icon name="CirclePlay" size={22} />
                Lihat Cara Kerja
              </Link>
            </div>
            <dl className="showcase-stats">
              <div>
                <dt>{features.length}</dt>
                <dd>Fitur AI dalam satu tempat</dd>
              </div>
              <div>
                <dt>{categories.length}</dt>
                <dd>Kategori kebutuhan</dd>
              </div>
              <div>
                <dt>1</dt>
                <dd>Workspace terpadu</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
      <div className="showcase-below">
        <nav className="showcase-quick-tools" aria-label="Akses cepat fitur">
          {quickTools.map((tool) => (
            <Link
              href={`/${tool.id}`}
              key={tool.id}
              className="showcase-quick-tool"
            >
              <span className={`showcase-tool-icon ${tool.color}`}>
                <Icon name={tool.icon} size={19} />
              </span>
              <div>
                <strong>{tool.name}</strong>
                <span>{tool.description}</span>
              </div>
            </Link>
          ))}
          <Link className="showcase-all-tools" href="/features">
            <strong>
              Lihat Semua Fitur <Icon name="ArrowRight" size={14} />
            </strong>
            <span>Jelajahi {features.length} kemampuan</span>
          </Link>
        </nav>
        <section className="showcase-featured" aria-labelledby="featured-title">
          <div className="showcase-featured-intro">
            <span className="showcase-eyebrow">
              <Icon name="Sparkles" size={13} />
              FITUR UNGGULAN
            </span>
            <h2 id="featured-title">
              Semua Kekuatan AI,
              <br />
              Dalam Satu Workspace.
            </h2>
            <p>
              Dari pertanyaan pertama sampai karya berikutnya. Temukan alat yang
              pas untuk langkahmu.
            </p>
            <Link className="showcase-primary" href="/features">
              Jelajahi Semua Fitur <Icon name="ArrowRight" size={16} />
            </Link>
          </div>
          <div className="showcase-featured-cards">
            {highlights.map((feature) => (
              <Link
                href={`/${feature.id}`}
                className="showcase-feature-card"
                key={feature.id}
              >
                <div
                  className={`showcase-feature-art showcase-art-${feature.art}`}
                  aria-hidden="true"
                />
                <div className="showcase-feature-card-copy">
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                  <span className="showcase-card-arrow">
                    <Icon name="ArrowRight" size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <div className="showcase-bottom-row">
          <section
            className="showcase-integrations"
            aria-label="Pilihan integrasi HOLYAI"
          >
            <div>
              <span>Pilihan integrasi</span>
              <strong>Untuk berbagai kebutuhan AI</strong>
            </div>
            <div className="showcase-provider">
              <Icon name="Aperture" size={20} />
              <strong>OpenAI</strong>
            </div>
            <div className="showcase-provider showcase-claude">
              <Icon name="Asterisk" size={24} />
              <strong>Claude</strong>
            </div>
            <div className="showcase-provider showcase-tavily">
              <Icon name="Orbit" size={22} />
              <strong>Tavily</strong>
            </div>
            <div className="showcase-provider showcase-canva">
              <span>C</span>
              <strong>Canva</strong>
            </div>
            <Link
              href="/features"
              aria-label="Pelajari kemampuan dan integrasi"
            >
              <Icon name="ArrowRight" size={16} />
            </Link>
          </section>
          <nav className="showcase-benefits" aria-label="Kenali HOLYAI">
            {benefits.map((benefit) => (
              <Link href={benefit.href} key={benefit.title}>
                <span>
                  <Icon name={benefit.icon} size={24} />
                </span>
                <div>
                  <strong>{benefit.title}</strong>
                  <p>{benefit.text}</p>
                </div>
              </Link>
            ))}
          </nav>
        </div>
        <div className="showcase-home-bottom">
          <span>HOLYAI · One AI, Endless Possibilities.</span>
          <Link href="/help">
            Butuh bantuan? <Icon name="ArrowUpRight" size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
