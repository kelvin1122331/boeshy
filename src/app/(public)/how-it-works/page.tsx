import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/common";
import {
  PublicPageIntro,
  PublicNextStep,
} from "@/components/marketing/public-shell";
export const metadata: Metadata = {
  title: "Cara kerja",
  description:
    "Kenali alur HOLYAI: bawa ide dan materi, pilih alat, tinjau hasil, lalu simpan dan ekspor.",
};
const steps = [
  {
    n: "01",
    icon: "Lightbulb",
    title: "Mulai dengan yang kamu punya.",
    text: "Sebuah pertanyaan, catatan kuliah, brief presentasi, atau dokumen penelitian. Ceritakan kebutuhanmu, lalu pilih alat yang sesuai melalui dashboard.",
    detail:
      "Kamu bisa mengetik langsung atau menambahkan materi pada fitur yang mendukung unggahan.",
    tags: ["Pertanyaan", "Materi belajar", "Dokumen", "Brief ide"],
  },
  {
    n: "02",
    icon: "SlidersHorizontal",
    title: "Bentuk hasilnya bersama AI.",
    text: "Tentukan tujuan, bahasa, dan detail yang dibutuhkan. Alur setiap alat disesuaikan dengan pekerjaannya: percakapan untuk chat, outline untuk dokumen, dan soal interaktif untuk belajar.",
    detail:
      "Periksa sumber, tinjau isi, dan edit bagian yang perlu diperbaiki. Hasil AI tetap membutuhkan penilaianmu.",
    tags: ["Atur kebutuhan", "Jalankan proses", "Tinjau & perbaiki"],
  },
  {
    n: "03",
    icon: "FolderCheck",
    title: "Simpan, lanjutkan, wujudkan.",
    text: "Hasil yang dibuat tersimpan dalam riwayat. Dokumen yang mendukung editor dapat dikelompokkan ke proyek dan diekspor untuk dipakai dalam pekerjaanmu.",
    detail:
      "Format ekspor mengikuti jenis hasil, misalnya PPTX untuk presentasi atau XLSX untuk matriks jurnal.",
    tags: ["Riwayat", "Proyek", "Ekspor sesuai kebutuhan"],
  },
];
const examples = [
  {
    icon: "Brain",
    title: "Aku ingin belajar.",
    steps: "Materi → soal ABCDE → latihan → ulasan jawaban",
    link: "/study-exam",
    cta: "Mulai Study with AI",
  },
  {
    icon: "GraduationCap",
    title: "Aku sedang meneliti.",
    steps: "Topik → metadata jurnal → sumber asli → referensi",
    link: "/academic-research",
    cta: "Buka Academic Research",
  },
  {
    icon: "Presentation",
    title: "Aku punya ide presentasi.",
    steps: "Brief → outline → draft slide → edit & ekspor",
    link: "/presentation-studio",
    cta: "Buka Presentation Studio",
  },
];
export default function HowItWorksPage() {
  return (
    <div className="marketing-page">
      <PublicPageIntro
        eyebrow="KENALI ALURNYA"
        title={
          <>
            Dari rasa ingin tahu,
            <br />
            <span>menjadi langkah nyata.</span>
          </>
        }
        description="Mulai sederhana. HOLYAI menyediakan ruang dan alatnya, sementara kamu tetap memegang arah dan keputusan akhirnya."
      />
      <section
        className="marketing-workflow"
        aria-label="Tiga langkah menggunakan HOLYAI"
      >
        {steps.map((s) => (
          <article key={s.n}>
            <div className="marketing-step-number">{s.n}</div>
            <div className="marketing-step-copy">
              <Icon name={s.icon} size={26} />
              <h2>{s.title}</h2>
              <p>{s.text}</p>
              <div className="marketing-step-tags">
                {s.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <small>{s.detail}</small>
            </div>
          </article>
        ))}
      </section>
      <section className="marketing-workflow-examples">
        <div className="marketing-section-heading">
          <div>
            <span className="marketing-eyebrow">
              BAYANGKAN LANGKAH PERTAMAMU
            </span>
            <h2>
              Tiga kebutuhan.
              <br />
              Tiga alur yang berbeda.
            </h2>
          </div>
        </div>
        <div>
          {examples.map((e) => (
            <article key={e.title}>
              <span>
                <Icon name={e.icon} size={24} />
              </span>
              <h3>{e.title}</h3>
              <p>{e.steps}</p>
              <Link href={e.link}>
                {e.cta}
                <Icon name="ArrowUpRight" size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <div className="marketing-workflow-note">
        <Icon name="Info" size={20} />
        <p>
          Fitur yang memerlukan integrasi akan menampilkan status
          konfigurasinya. Hasil baru ditandai selesai setelah data atau file
          benar-benar tersedia.
        </p>
        <Link href="/features">
          Kenali seluruh alat <Icon name="ArrowRight" size={15} />
        </Link>
      </div>
      <PublicNextStep title="Mulai dari satu hal yang ingin kamu selesaikan." />
    </div>
  );
}
