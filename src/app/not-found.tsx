import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">404 · HOLYAI</span>
      <h1>Halaman tidak ditemukan</h1>
      <p>Mulai kembali dari workspace kamu.</p>
      <Link className="btn btn-primary" href="/dashboard">
        Ke dashboard
      </Link>
    </main>
  );
}
