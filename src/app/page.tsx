import Link from "next/link";
import { Logo, Icon } from "@/components/common";
import { features } from "@/config/features";
export default function Home() {
  const featured = features.filter((f) =>
    [
      "chat",
      "image-generator",
      "presentation-studio",
      "academic-research",
      "study-exam",
      "task-manager",
    ].includes(f.id),
  );
  return (
    <main className="landing" id="main-content">
      <header className="public-nav">
        <Logo />
        <nav>
          <a href="#features">Kemampuan</a>
          <a href="#how-it-works">Cara kerja</a>
          <a href="#privacy">Privasi</a>
          <Link href="/login">Masuk</Link>
          <Link className="btn btn-primary" href="/register">
            Mulai sekarang <Icon name="ArrowUpRight" size={14} />
          </Link>
        </nav>
      </header>
      <section className="landing-hero">
        <span className="hero-pill">
          <Icon name="Sparkles" size={13} />
          18 kemampuan. Satu workspace.
        </span>
        <h1>
          One Intelligence.
          <br />
          <span>Endless Possibilities.</span>
        </h1>
        <p>
          Your unified workspace for AI creation, learning, research, and
          productivity. Ruang untuk semua hal yang ingin kamu wujudkan.
        </p>
        <div className="hero-buttons">
          <Link className="btn btn-primary" href="/register">
            Get Started <Icon name="ArrowRight" size={16} />
          </Link>
          <a className="btn btn-secondary" href="#features">
            Explore Features
          </a>
        </div>
        <small className="hero-footnote">
          Satu alur yang menyatu. Dari rasa ingin tahu menjadi karya.
        </small>
      </section>
      <div
        className="product-preview"
        aria-label="Pratinjau desain workspace HOLYAI"
      >
        <aside className="preview-sidebar">
          <Logo />
          <div className="active">Dashboard</div>
          <div>AI CREATION</div>
          <div>AI Chat</div>
          <div>Image Generator</div>
          <div>Presentation Studio</div>
          <div>RESEARCH & ACADEMIC</div>
          <div>Academic Research</div>
          <div>Journal Matrix</div>
          <div>LEARNING & WRITING</div>
          <div>Study with AI</div>
          <div>Auto Note-Taker</div>
        </aside>
        <div className="preview-content">
          <div className="eyebrow">YOUR AI COMMAND CENTER</div>
          <h2>Ide besar dimulai di sini.</h2>
          <div className="preview-command">
            <h3>
              Satu tempat untuk
              <br />
              semua kemungkinanmu.
            </h3>
            <div className="preview-input">
              Apa yang ingin kamu wujudkan hari ini?{" "}
              <Icon name="ArrowUpRight" size={12} />
            </div>
          </div>
          <div className="preview-tools">
            {featured.slice(0, 3).map((f) => (
              <div className="tool-card" key={f.id}>
                <span className={`tool-icon ${f.color}`}>
                  <Icon name={f.icon} size={18} />
                </span>
                <h3>{f.name}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <section className="landing-section" id="features">
        <div className="section-heading">
          <div>
            <div className="eyebrow">BUILT FOR YOUR NEXT BIG THING</div>
            <h2>
              Lebih sedikit berpindah.
              <br />
              Lebih banyak melangkah.
            </h2>
          </div>
          <p>
            Belajar, berkarya, dan meneliti dalam alur yang saling terhubung.
            Seluruh hasil tersimpan di workspace pribadimu.
          </p>
        </div>
        <div className="landing-feature-grid">
          {featured.map((f) => (
            <Link href={`/${f.id}`} className="tool-card" key={f.id}>
              <div className="flex-between">
                <span className={`tool-icon ${f.color}`}>
                  <Icon name={f.icon} size={23} />
                </span>
                <Icon name="ArrowUpRight" size={17} />
              </div>
              <h3>{f.name}</h3>
              <p>{f.description}</p>
            </Link>
          ))}
        </div>
        <p style={{ marginTop: 24, fontSize: 12 }}>
          Juga tersedia: Deep Search, Book Creator, Journal Matrix, Academic
          Document, Paraphrase, Auto Note-Taker, Methodology Checker, Rubric
          Assessment, Originality Review, Video Generator, Defense Simulator,
          dan Career Matcher.
        </p>
      </section>
      <div className="landing-band">
        <section className="landing-section" id="how-it-works">
          <div className="eyebrow">AN INTELLIGENT WAY TO WORK</div>
          <h2>
            Dari sebuah ide,
            <br />
            ke langkah yang nyata.
          </h2>
          <div className="how-grid">
            {[
              {
                n: "01",
                title: "Ceritakan kebutuhanmu",
                text: "Mulai dengan prompt, materi belajar, atau dokumen penelitian. Dashboard membantumu menemukan fitur yang tepat.",
              },
              {
                n: "02",
                title: "Bentuk bersama AI",
                text: "Tinjau sumber, perbaiki outline, dan kembangkan gagasan dalam editor yang sesuai dengan pekerjaanmu.",
              },
              {
                n: "03",
                title: "Simpan. Lanjutkan. Bagikan.",
                text: "Kelompokkan hasil ke proyek dan ekspor dokumen untuk digunakan dalam alur kerja berikutnya.",
              },
            ].map((x) => (
              <div key={x.n}>
                <b>{x.n} /</b>
                <h3>{x.title}</h3>
                <p>{x.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="landing-section trust-grid" id="privacy">
        <div>
          <div className="eyebrow">CLARITY BUILDS TRUST</div>
          <h2>Ruang kerja yang menghargai kepercayaanmu.</h2>
          <p style={{ marginTop: 18, fontSize: 13, lineHeight: 1.9 }}>
            AI membantu kamu melangkah. Kamu tetap memegang kendali atas materi,
            keputusan, dan hasil akhirnya.
          </p>
        </div>
        <div className="trust-list">
          {[
            {
              icon: "LockKeyhole",
              title: "Workspace milikmu",
              text: "Dokumen dan aktivitas diisolasi per akun, dengan akses file privat.",
            },
            {
              icon: "Link",
              title: "Sumber yang bisa ditelusuri",
              text: "Riset memakai tautan sumber asli dan metadata akademik. Informasi yang belum terverifikasi diberi catatan.",
            },
            {
              icon: "SlidersHorizontal",
              title: "Status yang transparan",
              text: "Integrasi yang belum aktif ditandai dengan jelas. Hasil baru dinyatakan selesai setelah file atau data tersedia.",
            },
          ].map((x) => (
            <div key={x.title}>
              <Icon name={x.icon} />
              <div>
                <h3>{x.title}</h3>
                <p>{x.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="landing-band">
        <section className="landing-section">
          <div className="section-heading">
            <h2>
              Hal yang mungkin
              <br />
              ingin kamu tahu.
            </h2>
          </div>
          <div className="faq">
            {[
              {
                q: "Untuk siapa HOLYAI dibuat?",
                a: "Pelajar, mahasiswa, peneliti, dosen, profesional, content creator, dan siapa pun yang ingin belajar serta berkarya dengan lebih terarah.",
              },
              {
                q: "Apakah semua fitur memerlukan API key?",
                a: "Task manager, proyek, penyimpanan hasil, dan pencarian metadata Crossref tidak memerlukan key AI. Fitur generatif memerlukan provider yang dikonfigurasi administrator. Status integrasi dapat dilihat di pengaturan.",
              },
              {
                q: "Apakah hasil riset dan penilaian bisa langsung dipercaya?",
                a: "Tinjau kembali hasil AI dan buka sumber aslinya. Skor rubrik dan kecocokan pekerjaan adalah perkiraan. Originality Review tidak menyatakan persentase plagiarisme tanpa database pembanding.",
              },
              {
                q: "Bisakah saya mengekspor hasil?",
                a: "Ya. Format tersedia sesuai jenis hasil, termasuk PDF, DOCX, TXT, PPTX untuk presentasi, XLSX untuk matriks atau rubrik, dan EPUB untuk buku.",
              },
            ].map((x) => (
              <details key={x.q}>
                <summary>{x.q}</summary>
                <p>{x.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
      <section className="landing-cta">
        <span className="eyebrow" style={{ color: "#93b4fc" }}>
          MAKE ROOM FOR WHAT’S NEXT
        </span>
        <h2>Mulai dari rasa ingin tahu.</h2>
        <p>Temukan kemungkinan berikutnya bersama HOLYAI.</p>
        <Link className="btn btn-primary" href="/register">
          Buka workspace kamu <Icon name="ArrowRight" size={16} />
        </Link>
      </section>
      <footer className="landing-footer">
        <Logo />
        <span>
          © {new Date().getFullYear()} HOLYAI · One Intelligence. Endless
          Possibilities.
        </span>
        <Link href="/login">Masuk ke workspace →</Link>
      </footer>
    </main>
  );
}
