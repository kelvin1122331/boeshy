import Link from "next/link";
import { Icon } from "@/components/common";
const intentions = [
  {
    icon: "GraduationCap",
    color: "emerald",
    title: "Temukan referensi yang tepat",
    description: "Telusuri jurnal dan metadata sumber asli.",
    href: "/academic-research",
  },
  {
    icon: "Presentation",
    color: "orange",
    title: "Bentuk ide jadi presentasi",
    description: "Susun outline, isi slide, dan catatan pembicara.",
    href: "/presentation-studio",
  },
  {
    icon: "Brain",
    color: "violet",
    title: "Pahami materi lebih dalam",
    description: "Ubah catatanmu menjadi latihan interaktif.",
    href: "/study-exam",
  },
];
const paths = [
  {
    n: "01",
    icon: "Sparkles",
    title: "Ciptakan sesuatu.",
    description: "Teks, visual, presentasi, dan buku.",
    category: "AI Creation",
  },
  {
    n: "02",
    icon: "ScanSearch",
    title: "Temukan jawabannya.",
    description: "Riset, jurnal, dan landasan akademik.",
    category: "Research & Academic",
  },
  {
    n: "03",
    icon: "BookOpen",
    title: "Pahami lebih dalam.",
    description: "Catatan, latihan, dan tulisan yang lebih jernih.",
    category: "Learning & Writing",
  },
  {
    n: "04",
    icon: "CheckSquare",
    title: "Melangkah lebih jauh.",
    description: "Tugas, latihan presentasi, dan arah karier.",
    category: "Productivity & Career",
  },
];
export default function Home() {
  return (
    <>
      <section className="marketing-home-hero">
        <div className="marketing-home-copy">
          <span className="marketing-eyebrow">
            <span />
            SATU WORKSPACE. 18 KEMAMPUAN.
          </span>
          <h1>
            One Intelligence.
            <br />
            <span>Endless Possibilities.</span>
          </h1>
          <p>
            Ruang untuk semua hal yang ingin kamu wujudkan. Belajar, berkarya,
            meneliti, dan menyelesaikan yang penting—bersama HOLYAI.
          </p>
          <div className="marketing-hero-actions">
            <Link className="btn btn-primary" href="/register">
              Mulai sekarang <Icon name="ArrowRight" size={17} />
            </Link>
            <Link className="btn btn-secondary" href="/features">
              Explore Features <Icon name="ArrowUpRight" size={16} />
            </Link>
          </div>
          <Link className="marketing-how-link" href="/how-it-works">
            <span>
              <Icon name="Play" size={11} />
            </span>
            Kenali cara kerjanya <Icon name="ArrowRight" size={14} />
          </Link>
        </div>
        <aside
          className="marketing-launchpad"
          aria-label="Pilihan awal di workspace"
        >
          <div className="marketing-launchpad-top">
            <span className="marketing-launchpad-symbol">
              <Icon name="Sparkles" size={22} />
            </span>
            <span>YOUR NEXT CHAPTER</span>
            <span className="marketing-launchpad-count">18 tools</span>
          </div>
          <h2>
            Apa yang ingin
            <br />
            kamu wujudkan?
          </h2>
          <p>Mulai dari rasa ingin tahu.</p>
          <div className="marketing-intentions">
            {intentions.map((i) => (
              <Link href={i.href} key={i.title}>
                <span className={`tool-icon ${i.color}`}>
                  <Icon name={i.icon} size={21} />
                </span>
                <div>
                  <h3>{i.title}</h3>
                  <p>{i.description}</p>
                </div>
                <Icon name="ArrowUpRight" size={16} />
              </Link>
            ))}
          </div>
          <div className="marketing-launchpad-bottom">
            <Icon name="FolderOpen" size={15} />
            Ide, materi, dan hasilmu. Satu tempat.
          </div>
        </aside>
      </section>
      <section className="marketing-paths">
        <div className="marketing-section-heading">
          <div>
            <span className="marketing-eyebrow">DIBUAT UNTUK LANGKAHMU</span>
            <h2>
              Banyak kebutuhan.
              <br />
              Satu ruang yang menyatu.
            </h2>
          </div>
          <Link href="/features" className="marketing-inline-link">
            Jelajahi semua kemampuan <Icon name="ArrowRight" size={16} />
          </Link>
        </div>
        <div className="marketing-path-grid">
          {paths.map((p) => (
            <Link
              key={p.n}
              href={`/features?category=${encodeURIComponent(p.category)}`}
            >
              <div>
                <span>{p.n}</span>
                <Icon name={p.icon} size={23} />
              </div>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <Icon name="ArrowUpRight" size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="marketing-home-note">
        <Icon name="ShieldCheck" size={22} />
        <div>
          <h2>Kejelasan adalah bagian dari pengalaman.</h2>
          <p>
            Kenali bagaimana materi diproses, hasil ditinjau, dan data dikelola.
          </p>
        </div>
        <Link href="/privacy" className="marketing-inline-link">
          Tentang privasi <Icon name="ArrowRight" size={15} />
        </Link>
      </section>
    </>
  );
}
