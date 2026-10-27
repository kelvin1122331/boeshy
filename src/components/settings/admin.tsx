"use client";
import { useAPI } from "@/hooks/use-api";
import { PageHeader, Alert, Spinner } from "@/components/common";
export function Admin() {
  const { data, error } = useAPI<Record<string, unknown>>("admin");
  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Operasional HOLYAI"
        description="Data pengguna, pekerjaan, penggunaan, dan konfigurasi. Kredensial dikelola melalui secret server."
      />
      {error ? (
        <Alert error>{error}</Alert>
      ) : !data ? (
        <Spinner />
      ) : (
        Object.entries(data).map(([key, value]) => (
          <section className="panel" key={key} style={{ marginBottom: 20 }}>
            <h2>{key}</h2>
            <pre style={{ fontSize: 11, overflow: "auto", marginTop: 15 }}>
              {JSON.stringify(value, null, 2)}
            </pre>
          </section>
        ))
      )}
    </div>
  );
}
