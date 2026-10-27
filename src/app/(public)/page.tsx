import Link from "next/link";
import { Icon } from "@/components/common";

export default function Home() {
  return (
    <section className="marketing-home" aria-labelledby="home-title">
      <span className="marketing-home-badge">
        <Icon name="Sparkles" size={14} />
        18 kemampuan. Satu workspace.
      </span>
      <h1 id="home-title">
        One Intelligence.
        <br />
        <span>Endless Possibilities.</span>
      </h1>
      <p className="marketing-home-description">
        Your unified workspace for AI creation, learning, research, and
        productivity. Ruang untuk semua hal yang ingin kamu wujudkan.
      </p>
      <div className="marketing-home-actions">
        <Link className="btn btn-primary" href="/register">
          Get Started <Icon name="ArrowRight" size={17} />
        </Link>
        <Link className="btn btn-secondary" href="/features">
          Explore Features
        </Link>
      </div>
      <p className="marketing-home-caption">
        Satu alur yang menyatu. Dari rasa ingin tahu menjadi karya.
      </p>
    </section>
  );
}
