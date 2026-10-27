import Link from "next/link";
import { Logo, Icon } from "@/components/common";
import { PublicHeader } from "./public-header";
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-site">
      <PublicHeader />
      <main id="main-content" className="marketing-main">
        {children}
      </main>
      <footer className="marketing-footer">
        <div className="marketing-footer-main">
          <div>
            <Logo href="/" />
            <p>
              Ruang untuk belajar, mencipta,
              <br />
              dan melangkah lebih jauh.
            </p>
          </div>
          <nav aria-label="Navigasi footer">
            <Link href="/">Beranda</Link>
            <Link href="/features">Kemampuan</Link>
            <Link href="/how-it-works">Cara kerja</Link>
            <Link href="/privacy">Privasi</Link>
          </nav>
          <Link className="marketing-footer-cta" href="/dashboard">
            Buka workspace <Icon name="ArrowUpRight" size={17} />
          </Link>
        </div>
        <div className="marketing-footer-bottom">
          <span>© {new Date().getFullYear()} HOLYAI</span>
          <span>One Intelligence. Endless Possibilities.</span>
        </div>
      </footer>
    </div>
  );
}
export function PublicPageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
}) {
  return (
    <header className="marketing-page-intro">
      <span className="marketing-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
export function PublicNextStep({
  title = "Kemungkinan berikutnya dimulai dari kamu.",
  description = "Bawa ide, materi, atau pertanyaanmu ke workspace HOLYAI.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="marketing-next-step">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <Link className="btn btn-primary" href="/register">
        Mulai sekarang <Icon name="ArrowRight" size={17} />
      </Link>
    </section>
  );
}
