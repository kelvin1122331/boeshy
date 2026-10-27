"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { features, categories, routeIntent } from "@/config/features";
import { Icon, Empty, Alert } from "@/components/common";
import { useAPI, type Item } from "@/hooks/use-api";
export function Dashboard({ name }: { name: string }) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("Semua fitur");
  const router = useRouter();
  const { data, error } = useAPI<{
    items: Item[];
    tasks: number;
    usage: { _count: number };
    files: number;
  }>("dashboard");
  const featured = [
    "chat",
    "image-generator",
    "presentation-studio",
    "academic-research",
    "study-exam",
    "academic-document",
  ];
  function launch(text = query) {
    if (text.trim())
      router.push(`/${routeIntent(text)}?prompt=${encodeURIComponent(text)}`);
  }
  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <div>
          <div className="eyebrow">YOUR AI COMMAND CENTER</div>
          <h1>
            Ide besar dimulai di sini<span className="blue-text">.</span>
          </h1>
          <p>
            Halo, {name.split(" ")[0]}. Apa yang ingin kamu wujudkan hari ini?
          </p>
        </div>
        <Link href="/projects" className="btn btn-secondary">
          <Icon name="FolderPlus" size={17} />
          Proyek baru
        </Link>
      </div>
      <section className="command-card">
        <div className="command-copy">
          <span className="command-label">
            <Icon name="Sparkles" size={15} /> ONE WORKSPACE. ENDLESS
            POSSIBILITIES.
          </span>
          <h2>
            Satu tempat untuk <br />
            semua kemungkinanmu.
          </h2>
          <p>
            Belajar lebih dalam, ciptakan lebih banyak,
            <br className="desktop-only" /> dan temukan jawaban yang kamu
            butuhkan.
          </p>
        </div>
        <div className="command-form">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              launch();
            }}
          >
            <label htmlFor="command-input">Mulai dari sebuah ide</label>
            <textarea
              id="command-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Misalnya, carikan jurnal tentang AI dalam pendidikan…"
            />
            <div className="command-form-bottom">
              <span>
                <Icon name="CornerDownLeft" size={14} />
                Temukan fitur yang tepat untuk idemu
              </span>
              <button
                aria-label="Mulai dengan ide ini"
                disabled={!query.trim()}
              >
                <Icon name="ArrowUp" size={20} />
              </button>
            </div>
          </form>
          <div className="command-suggestions">
            <button onClick={() => launch("Carikan jurnal pendidikan")}>
              Telusuri jurnal <Icon name="ArrowUpRight" size={12} />
            </button>
            <button onClick={() => launch("Buat presentasi tentang")}>
              Buat presentasi <Icon name="ArrowUpRight" size={12} />
            </button>
            <button onClick={() => launch("Belajar dengan soal latihan")}>
              Mulai belajar <Icon name="ArrowUpRight" size={12} />
            </button>
          </div>
        </div>
      </section>
      <div className="stats-strip">
        {[
          {
            icon: "Sparkles",
            label: "Fitur dalam satu workspace",
            value: "18",
          },
          {
            icon: "FolderOpen",
            label: "Karya tersimpan",
            value:
              data?.items.length === 6 ? "6+" : String(data?.items.length ?? 0),
          },
          {
            icon: "CheckSquare",
            label: "Tugas aktif",
            value: String(data?.tasks ?? 0),
          },
          {
            icon: "Files",
            label: "Dokumen di perpustakaan",
            value: String(data?.files ?? 0),
          },
        ].map((s) => (
          <div key={s.label}>
            <span className="stat-icon">
              <Icon name={s.icon} size={18} />
            </span>
            <div>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>
      <section>
        <div className="section-heading">
          <div>
            <h2>Pilihan untuk memulai</h2>
            <p>Dari percakapan pertama hingga karya berikutnya.</p>
          </div>
          <a href="#all-tools" className="text-link">
            Jelajahi semua fitur <Icon name="ArrowRight" size={16} />
          </a>
        </div>
        <div className="featured-grid">
          {featured.map((id) => {
            const f = features.find((f) => f.id === id)!;
            return (
              <Link href={`/${f.id}`} className="tool-card" key={id}>
                <div className="flex-between">
                  <span className={`tool-icon ${f.color}`}>
                    <Icon name={f.icon} size={23} />
                  </span>
                  <Icon name="ArrowUpRight" size={17} className="card-arrow" />
                </div>
                <h3>{f.name}</h3>
                <p>{f.description}</p>
                <span className="card-category">{f.category}</span>
              </Link>
            );
          })}
        </div>
      </section>
      <section id="all-tools">
        <div className="section-heading">
          <div>
            <h2>Seluruh kemampuan, satu ruang</h2>
            <p>Pilih alat yang cocok dengan langkahmu.</p>
          </div>
          <span className="badge">18 tools</span>
        </div>
        <div
          className="category-tabs"
          role="tablist"
          aria-label="Kategori fitur"
        >
          {["Semua fitur", ...categories].map((c) => (
            <button
              role="tab"
              aria-selected={category === c}
              className={category === c ? "selected" : ""}
              key={c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="all-tools-grid">
          {features
            .filter(
              (f) => category === "Semua fitur" || f.category === category,
            )
            .map((f) => (
              <Link href={`/${f.id}`} key={f.id} className="compact-tool">
                <span className={`tool-icon ${f.color}`}>
                  <Icon name={f.icon} size={20} />
                </span>
                <span>
                  <b>{f.name}</b>
                  <small>{f.description}</small>
                </span>
                <Icon name="ChevronRight" size={16} />
              </Link>
            ))}
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <h2>Lanjutkan langkah terakhir</h2>
            <p>Semua pekerjaanmu, tersimpan dalam satu tempat.</p>
          </div>
          <Link href="/history" className="text-link">
            Lihat riwayat <Icon name="ArrowRight" size={16} />
          </Link>
        </div>
        {error ? (
          <Alert error>{error}</Alert>
        ) : data?.items.length ? (
          <div className="activity-list">
            {data.items.map((item) => (
              <Link key={item.id} href={`/${item.kind}?item=${item.id}`}>
                <span className="activity-icon">
                  <Icon
                    name={
                      features.find((f) => f.id === item.kind)?.icon ||
                      "FileText"
                    }
                  />
                </span>
                <span>
                  <b>{item.title}</b>
                  <small>
                    {features.find((f) => f.id === item.kind)?.name}
                  </small>
                </span>
                <time>
                  {new Date(item.updatedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </time>
                <Icon name="ArrowUpRight" size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel">
            <Empty
              icon="Clock3"
              title="Ruang untuk karya pertamamu"
              description="Mulai percakapan, simpan riset, atau buat dokumen. Aktivitasmu akan muncul di sini."
            />
          </div>
        )}
      </section>
    </div>
  );
}
