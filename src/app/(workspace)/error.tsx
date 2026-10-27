"use client";
import { Alert } from "@/components/common";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="stack">
      <h1>Workspace belum dapat dimuat</h1>
      <Alert error>
        Periksa koneksi dan layanan server, lalu coba kembali.
      </Alert>
      <Button onClick={reset}>Coba lagi</Button>
    </div>
  );
}
