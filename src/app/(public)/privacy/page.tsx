import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/common";
import { PublicPageIntro } from "@/components/marketing/public-shell";
export const metadata: Metadata = {
  title: "Privasi",
  description:
    "Pelajari bagaimana akun, dokumen, data AI, dan kendali data pribadi dikelola di HOLYAI.",
};
const principles = [
  {
    icon: "LockKeyhole",
    title: "Akses berdasarkan akun",
    text: "Dokumen dan aktivitas diperiksa kepemilikannya sebelum dapat dibuka.",
  },
  {
    icon: "SlidersHorizontal",
    title: "Kendali atas datamu",
    text: "Kelola file, putuskan koneksi, ekspor data, atau hapus akun melalui pengaturan.",
  },
  {
    icon: "ScanEye",
    title: "Proses yang transparan",
    text: "Materi untuk fitur generatif diproses oleh penyedia AI yang dikonfigurasi.",
  },
];
export default function PrivacyPage() {
  return (
    <div className="marketing-page marketing-privacy-page">
      <PublicPageIntro
        eyebrow="PRIVASI & KENDALI DATA"
        title={
          <>
            Ruang untuk berkarya.
            <br />
            <span>Kejelasan untuk percaya.</span>
          </>
        }
        description="Kenali data yang disimpan, bagaimana materi digunakan, dan pilihan yang tersedia untuk mengelolanya di HOLYAI."
      />
      <section
        className="marketing-privacy-principles"
        aria-label="Prinsip pengelolaan data"
      >
        {principles.map((p) => (
          <article key={p.title}>
            <span>
              <Icon name={p.icon} size={24} />
            </span>
            <h2>{p.title}</h2>
            <p>{p.text}</p>
          </article>
        ))}
      </section>
      <div className="marketing-privacy-content">
        <aside>
          <span className="marketing-eyebrow">YANG PERLU KAMU TAHU</span>
          <h2>
            Data yang jelas.
            <br />
            Pilihan yang terbuka.
          </h2>
          <p>
            Penjelasan ini menggambarkan cara kerja aplikasi. Pengaturan
            penyimpanan dan cadangan mengikuti pengelola layanan HOLYAI yang
            kamu gunakan.
          </p>
          <Link className="marketing-inline-link" href="/settings/privacy">
            Kelola data di pengaturan <Icon name="ArrowUpRight" size={16} />
          </Link>
        </aside>
        <div className="marketing-privacy-articles">
          <article>
            <span>01 / AKUN</span>
            <h2>Informasi untuk ruang kerjamu.</h2>
            <p>
              HOLYAI menyimpan informasi akun seperti nama, email, preferensi,
              dan sesi masuk. Kata sandi diproses melalui sistem autentikasi dan
              tidak disimpan sebagai teks biasa.
            </p>
            <p>
              Aktivitas seperti percakapan, tugas, dokumen, serta hasil ujian
              disimpan agar dapat dilanjutkan dan dilihat kembali.
            </p>
          </article>
          <article>
            <span>02 / DOKUMEN & FILE</span>
            <h2>Materi milikmu, dengan akses yang dibatasi.</h2>
            <p>
              File yang diunggah disimpan pada penyimpanan privat yang
              dikonfigurasi. Aplikasi memeriksa akun pemilik sebelum memberikan
              tautan unduh sementara.
            </p>
            <p>
              Untuk analisis dokumen, teks dapat diekstrak dan disimpan sebagai
              bagian dari materi. Kamu dapat menghapus file melalui perpustakaan
              workspace.
            </p>
          </article>
          <article>
            <span>03 / PEMROSESAN AI</span>
            <h2>Ketahui ke mana materimu diproses.</h2>
            <p>
              Prompt dan materi yang diperlukan untuk menjalankan fitur AI
              dikirim ke penyedia yang diaktifkan oleh pengelola. Pemrosesan dan
              retensi di sisi penyedia mengikuti ketentuan penyedia tersebut.
            </p>
            <p>
              Saat menghubungkan Canva atau layanan lain, izin akses mengikuti
              persetujuan akunmu. Memutuskan koneksi menghapus akses yang
              tersimpan di HOLYAI; desain atau data yang sudah berada di layanan
              lain dikelola melalui layanan tersebut.
            </p>
          </article>
          <article>
            <span>04 / EKSPOR & PENGHAPUSAN</span>
            <h2>Tentukan langkah berikutnya untuk datamu.</h2>
            <p>
              Pengaturan privasi menyediakan ekspor data pribadi dan penghapusan
              akun. Penghapusan mencakup data aplikasi serta file terkait; data
              dalam cadangan dikelola terpisah sesuai kebijakan pengelola
              layanan.
            </p>
            <p>
              Unduh hasil yang ingin disimpan sebelum menghapus akun. Untuk
              informasi tentang retensi cadangan atau akses operasional, hubungi
              pengelola instance HOLYAI yang kamu gunakan.
            </p>
          </article>
        </div>
      </div>
      <section className="marketing-privacy-action">
        <span>
          <Icon name="Settings2" size={27} />
        </span>
        <div>
          <h2>Pengaturanmu, dalam satu tempat.</h2>
          <p>
            Masuk ke akun untuk mengelola profil, koneksi layanan, sesi, dan
            data pribadi.
          </p>
        </div>
        <Link href="/settings/privacy" className="btn btn-secondary">
          Buka pengaturan privasi <Icon name="ArrowRight" size={16} />
        </Link>
      </section>
    </div>
  );
}
