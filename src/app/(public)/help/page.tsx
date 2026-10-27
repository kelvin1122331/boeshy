import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/common";
import {
  PublicNextStep,
  PublicPageIntro,
} from "@/components/marketing/public-shell";

export const metadata: Metadata = {
  title: "Bantuan",
  description: "Panduan awal dan pertanyaan umum tentang workspace HOLYAI.",
};
const questions = [
  {
    question: "Bagaimana cara mulai menggunakan HOLYAI?",
    answer:
      "Buat akun melalui Mulai sekarang, lalu pilih fitur dari dashboard. Untuk memulai, kamu bisa menulis pertanyaan di AI Chat atau memilih alat yang sesuai dengan materi dan tujuanmu.",
  },
  {
    question: "Apa saja yang bisa dikerjakan di workspace?",
    answer:
      "Ada 18 alat dalam 4 kategori: kreasi AI, riset dan akademik, belajar dan menulis, serta produktivitas dan karier. Buka halaman Fitur untuk melihat fungsi setiap alat.",
  },
  {
    question: "Mengapa suatu fitur belum bisa menghasilkan jawaban?",
    answer:
      "Sebagian alat memerlukan layanan AI dan integrasi yang sudah dikonfigurasi. Jika belum tersedia, workspace akan menunjukkan statusnya. Pastikan konfigurasi layanan dan akses akun sudah sesuai sebelum menjalankan kembali.",
  },
  {
    question: "Apakah hasil AI perlu diperiksa kembali?",
    answer:
      "Ya. Tinjau isi, cek sumber asli, dan perbaiki bagian yang perlu sebelum memakai atau membagikan hasilnya. Kamu tetap memegang keputusan akhir atas karyamu.",
  },
  {
    question: "Di mana saya bisa melanjutkan hasil sebelumnya?",
    answer:
      "Buka Riwayat di workspace. Hasil yang mendukung editor juga bisa dikelompokkan ke Proyek dan diekspor sesuai format yang tersedia pada alat tersebut.",
  },
  {
    question: "Bagaimana materi dan data saya diproses?",
    answer:
      "Materi dapat diproses oleh layanan pihak ketiga sesuai alat dan integrasi yang digunakan. Halaman Privasi menjelaskan penyimpanan, pemrosesan oleh penyedia, serta hal yang perlu diperhatikan sebelum mengunggah dokumen.",
  },
];
export default function HelpPage() {
  return (
    <div className="marketing-page">
      <PublicPageIntro
        eyebrow="KAMI BANTU LANGKAH PERTAMAMU"
        title={
          <>
            Ada yang ingin
            <br />
            <span>kamu ketahui?</span>
          </>
        }
        description="Panduan singkat agar kamu bisa mulai dengan lebih jelas, lalu fokus pada hal yang ingin diwujudkan."
      />
      <div className="marketing-help-links">
        <Link href="/how-it-works">
          <Icon name="PlayCircle" size={24} />
          <div>
            <h2>Kenali cara kerjanya</h2>
            <p>Dari ide dan materi, hingga hasil yang bisa dilanjutkan.</p>
          </div>
          <Icon name="ArrowUpRight" />
        </Link>
        <Link href="/privacy">
          <Icon name="ShieldCheck" size={24} />
          <div>
            <h2>Pahami privasi datamu</h2>
            <p>Ketahui bagaimana materi disimpan dan diproses.</p>
          </div>
          <Icon name="ArrowUpRight" />
        </Link>
      </div>
      <section className="marketing-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Pertanyaan yang sering diajukan</h2>
        {questions.map((item) => (
          <details key={item.question}>
            <summary>
              {item.question}
              <Icon name="Plus" size={18} />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>
      <PublicNextStep title="Sudah siap mencoba ide pertamamu?" />
    </div>
  );
}
