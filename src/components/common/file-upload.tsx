"use client";
import { useRef, useState } from "react";
import { Icon, Alert, Spinner } from "./index";
import { api } from "@/hooks/use-api";
export type Upload = { id: string; name: string; warning?: string };
export function FileUpload({
  files,
  onChange,
  multiple = true,
}: {
  files: Upload[];
  onChange: (files: Upload[]) => void;
  multiple?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="file-upload">
      <input
        ref={input}
        type="file"
        multiple={multiple}
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={async (e) => {
          setBusy(true);
          setError("");
          const added = [];
          try {
            for (const f of Array.from(e.target.files || [])) {
              const body = new FormData();
              body.set("file", f);
              added.push(
                await api<Upload>("/api/upload", { method: "POST", body }),
              );
            }
            onChange([...files, ...added]);
          } catch (e) {
            setError((e as Error).message);
            onChange([...files, ...added]);
          } finally {
            setBusy(false);
            if (input.current) input.current.value = "";
          }
        }}
      />
      <button
        type="button"
        className="upload-target"
        onClick={() => input.current?.click()}
        disabled={busy}
      >
        {busy ? <Spinner /> : <Icon name="Upload" size={22} />}
        <b>{busy ? "Membaca dokumen…" : "Tambahkan materi atau referensi"}</b>
        <small>PDF, DOCX, TXT, atau gambar · Maks. 10 MB per file</small>
      </button>
      {files.map((f) => (
        <div className="uploaded-file" key={f.id}>
          <Icon name="FileText" size={16} />
          <span>
            {f.name}
            {f.warning && <small>{f.warning}</small>}
          </span>
          <button
            type="button"
            aria-label={`Lepas ${f.name}`}
            onClick={() => onChange(files.filter((x) => x.id !== f.id))}
          >
            <Icon name="X" size={15} />
          </button>
        </div>
      ))}
      {error && <Alert error>{error}</Alert>}
    </div>
  );
}
