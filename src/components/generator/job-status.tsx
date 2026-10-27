"use client";
import { Icon, Spinner, Alert } from "@/components/common";
import type { GenerationJob } from "@/hooks/use-api";
const stages: Record<string, string> = {
  queued: "Menunggu worker",
  reading: "Membaca materi",
  planning: "Menyusun rencana pencarian",
  searching: "Menelusuri sumber",
  analyzing: "Membandingkan bukti",
  synthesizing: "Menyusun laporan",
  generating: "Menghasilkan karya",
  "summarizing-material": "Membaca bagian dokumen",
  in_progress: "Provider sedang memproses",
  completed: "Selesai",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};
export function JobStatus({ job }: { job: GenerationJob }) {
  if (job.status === "failed")
    return (
      <Alert error>
        {job.error || "Pekerjaan gagal. Kamu dapat mencoba kembali."}
      </Alert>
    );
  return (
    <div className="job-status" role="status">
      {["completed", "cancelled"].includes(job.status) ? (
        <Icon name={job.status === "completed" ? "CircleCheck" : "Ban"} />
      ) : (
        <Spinner />
      )}
      <div>
        <b>{stages[job.stage] || job.stage}</b>
        <small>
          {job.status === "queued"
            ? "Pekerjaan akan dimulai setelah worker tersedia."
            : "Status berasal dari proses server dan provider."}
        </small>
      </div>
      <span className="badge">{job.status}</span>
    </div>
  );
}
