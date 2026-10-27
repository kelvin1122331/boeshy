"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { features, categories } from "@/config/features";
import { Icon } from "@/components/common";
const groups = [
  {
    id: categories[0],
    label: "Kreasi AI",
    description: "Beri bentuk pada ide. Dari percakapan hingga karya visual.",
    icon: "Sparkles",
  },
  {
    id: categories[1],
    label: "Riset & akademik",
    description: "Telusuri sumber dan susun landasan penelitianmu.",
    icon: "GraduationCap",
  },
  {
    id: categories[2],
    label: "Belajar & menulis",
    description: "Pahami materi, uji pemahaman, dan perjelas gagasan.",
    icon: "BookOpen",
  },
  {
    id: categories[3],
    label: "Produktivitas & karier",
    description: "Atur langkahmu dan persiapkan kesempatan berikutnya.",
    icon: "BriefcaseBusiness",
  },
];
export function FeatureCatalogue() {
  const params = useSearchParams(),
    router = useRouter();
  const selected = params.get("category");
  const category = categories.includes(selected || "") ? selected : "all";
  const [query, setQuery] = useState("");
  const visible = features.filter(
    (f) =>
      (category === "all" || f.category === category) &&
      `${f.name} ${f.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="marketing-catalogue">
      <div className="marketing-catalogue-toolbar">
        <label className="marketing-feature-search">
          <Icon name="Search" size={19} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari fitur, misalnya jurnal atau presentasi…"
            aria-label="Cari kemampuan"
          />
          {query && (
            <button aria-label="Hapus pencarian" onClick={() => setQuery("")}>
              <Icon name="X" size={16} />
            </button>
          )}
        </label>
        <span aria-live="polite">
          {visible.length} kemampuan untuk dijelajahi
        </span>
      </div>
      <div
        className="marketing-category-filters"
        role="group"
        aria-label="Kategori kemampuan"
      >
        {[{ id: "all", label: "Semua kemampuan" }, ...groups].map((g) => (
          <button
            key={g.id}
            aria-pressed={category === g.id}
            onClick={() =>
              router.replace(
                g.id === "all"
                  ? "/features"
                  : `/features?category=${encodeURIComponent(g.id)}`,
                { scroll: false },
              )
            }
          >
            {g.label}
          </button>
        ))}
      </div>
      {visible.length ? (
        groups
          .filter((g) => visible.some((f) => f.category === g.id))
          .map((g) => (
            <section className="marketing-feature-group" key={g.id}>
              <div className="marketing-feature-group-heading">
                <span>
                  <Icon name={g.icon} size={22} />
                </span>
                <div>
                  <h2>{g.label}</h2>
                  <p>{g.description}</p>
                </div>
                <span className="marketing-group-count">
                  {visible.filter((f) => f.category === g.id).length} alat
                </span>
              </div>
              <div className="marketing-feature-grid">
                {visible
                  .filter((f) => f.category === g.id)
                  .map((f) => (
                    <Link
                      href={`/${f.id}`}
                      className="marketing-feature-card"
                      key={f.id}
                    >
                      <span className={`tool-icon ${f.color}`}>
                        <Icon name={f.icon} size={23} />
                      </span>
                      <h3>{f.name}</h3>
                      <p>{f.description}</p>
                      <span className="marketing-open-tool">
                        Buka alat <Icon name="ArrowUpRight" size={16} />
                      </span>
                    </Link>
                  ))}
              </div>
            </section>
          ))
      ) : (
        <div className="marketing-search-empty">
          <Icon name="SearchX" size={30} />
          <h2>Belum ada fitur yang cocok.</h2>
          <p>Coba kata kunci lain atau tampilkan seluruh kemampuan.</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setQuery("");
              router.replace("/features", { scroll: false });
            }}
          >
            Tampilkan semua
          </button>
        </div>
      )}
      <div className="marketing-configuration-note">
        <Icon name="Info" size={18} />
        <p>
          Masuk untuk menggunakan alat. Sebagian fitur memerlukan layanan AI
          yang terhubung; statusnya dapat dilihat di pengaturan workspace.
        </p>
      </div>
    </div>
  );
}
