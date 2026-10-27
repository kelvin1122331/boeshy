import { credentialFields, type AuthMethod } from "@/config/providers";
import { AppError } from "@/lib/errors";
import { db } from "@/lib/database";
import { providerRuntime, validateEndpoint } from "./configuration";
import { auditAdmin } from "./access";
export type ProbeResult = {
  status: "connected" | "failed" | "verification_unavailable";
  code: string;
  message: string;
  latencyMs: number | null;
  models?: { identifier: string; name: string }[];
};
export async function probeProvider(
  config: NonNullable<Awaited<ReturnType<typeof providerRuntime>>>,
  fetcher: typeof fetch = fetch,
): Promise<ProbeResult> {
  validateEndpoint(config.id, config.endpoint);
  const started = Date.now();
  let url = config.endpoint;
  const headers: Record<string, string> = {};
  switch (config.id) {
    case "openai":
      url += "/models";
      headers.Authorization = `Bearer ${config.secrets.apiKey}`;
      break;
    case "gemini":
      url += "/models";
      headers["x-goog-api-key"] = config.secrets.apiKey;
      break;
    case "anthropic":
      url += "/models";
      headers["x-api-key"] = config.secrets.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      break;
    case "tavily":
      url += "/usage";
      headers.Authorization = `Bearer ${config.secrets.apiKey}`;
      break;
    case "brave":
      url += "/web/search?q=HOLYAI&count=1";
      headers["X-Subscription-Token"] = config.secrets.apiKey;
      break;
    case "crossref":
      url += "/works?rows=1";
      break;
    case "openalex":
      url += "/works?per_page=1";
      if (config.secrets.apiKey)
        headers.Authorization = `Bearer ${config.secrets.apiKey}`;
      break;
    case "semantic-scholar":
      url += "/paper/search?query=education&limit=1";
      if (config.secrets.apiKey) headers["x-api-key"] = config.secrets.apiKey;
      break;
    case "arbeitnow":
      url += "/job-board-api";
      break;
    case "adzuna": {
      const country =
        (config.settings as { defaultCountry?: string }).defaultCountry || "gb";
      url +=
        `/jobs/${country}/search/1?` +
        new URLSearchParams({
          app_id: config.secrets.appId,
          app_key: config.secrets.appKey,
          results_per_page: "1",
        });
      break;
    }
    default:
      return {
        status: "verification_unavailable",
        code: "NO_SAFE_PROBE",
        message:
          config.id === "canva" || config.id === "google"
            ? "Kredensial aplikasi tersimpan. Verifikasi akses memerlukan persetujuan OAuth per pengguna; belum ada koneksi yang diklaim berhasil."
            : "Konfigurasi fondasi tersedia. Adapter dan pemeriksaan koneksi platform ini belum dipasang.",
        latencyMs: null,
      };
  }
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(Math.min(config.timeoutMs, 20000)),
    });
    if (!response.ok)
      return {
        status: "failed",
        code: `HTTP_${response.status}`,
        message:
          response.status === 401 || response.status === 403
            ? "Provider menolak autentikasi atau izin akun."
            : response.status === 429
              ? "Provider membatasi permintaan. Coba lagi setelah batas layanan pulih."
              : "Provider belum dapat menyelesaikan pemeriksaan koneksi.",
        latencyMs: Date.now() - started,
      };
    const data = await response.json();
    if (
      data?.error ||
      data?.success === false ||
      (config.id === "crossref" && !Array.isArray(data?.message?.items)) ||
      (config.id === "openalex" && !Array.isArray(data?.results)) ||
      (config.id === "brave" && !Array.isArray(data?.web?.results)) ||
      (config.id === "adzuna" && !Array.isArray(data?.results)) ||
      (config.id === "arbeitnow" && !Array.isArray(data?.data))
    )
      return {
        status: "failed",
        code: "INVALID_RESPONSE",
        message: "Respons endpoint belum memenuhi format yang diharapkan.",
        latencyMs: Date.now() - started,
      };
    const models =
      config.id === "gemini"
        ? Array.isArray(data.models)
          ? data.models
          : []
        : ["openai", "anthropic"].includes(config.id)
          ? Array.isArray(data.data)
            ? data.data
            : []
          : undefined;
    if (
      ["openai", "anthropic", "gemini"].includes(config.id) &&
      (!models || !models.length)
    )
      return {
        status: "failed",
        code: "INVALID_RESPONSE",
        message:
          "Respons model provider belum memenuhi format yang diharapkan.",
        latencyMs: Date.now() - started,
      };
    return {
      status: "connected",
      code: "ACCESS_VERIFIED",
      message:
        "Akses endpoint berhasil diperiksa. Ini bukan klaim keberhasilan generasi atau jaminan akses semua model.",
      latencyMs: Date.now() - started,
      ...(models
        ? {
            models: models
              .slice(0, 100)
              .map(
                (m: { id?: string; name?: string; displayName?: string }) => ({
                  identifier: String(m.id || m.name || "").replace(
                    /^models\//,
                    "",
                  ),
                  name: String(m.displayName || m.id || m.name || ""),
                }),
              ),
          }
        : {}),
    };
  } catch {
    return {
      status: "failed",
      code: "NETWORK_OR_TIMEOUT",
      message:
        "Koneksi tidak dapat diverifikasi. Periksa jaringan, timeout, dan konfigurasi provider.",
      latencyMs: Date.now() - started,
    };
  }
}
export async function testProvider(actorId: string, id: string) {
  const config = await providerRuntime(id);
  if (!config) throw new AppError(404, "Provider tidak ditemukan.");
  if (
    config.authMethod !== "public" &&
    !Object.keys(
      credentialFields(config.definition, config.authMethod as AuthMethod),
    ).every((field) => !!config.secrets[field])
  )
    throw new AppError(400, "Lengkapi kredensial sebelum melakukan tes.");
  const result = await probeProvider(config);
  const changed = await db.providerConfiguration.updateMany({
    where: { id, revision: config.revision },
    data: {
      connectionStatus: result.status,
      checkedAt: new Date(),
      latencyMs: result.latencyMs,
      errorCode: result.code,
      safeMessage: result.message,
    },
  });
  if (!changed.count)
    throw new AppError(
      409,
      "Konfigurasi berubah selama tes. Ulangi pemeriksaan untuk kredensial terbaru.",
    );
  await auditAdmin(actorId, "provider.tested", id, {
    status: result.status,
    code: result.code,
  });
  return { ...result, checkedAt: new Date().toISOString() };
}
