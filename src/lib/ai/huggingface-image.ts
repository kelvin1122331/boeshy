import { InferenceClient } from "@huggingface/inference";
import { AppError } from "@/lib/errors";
import type { ModelRoute } from "@/server/admin/router";

export async function huggingFaceImage(
  route: ModelRoute,
  prompt: string,
  width: number,
  height: number,
  fetcher: typeof fetch = fetch,
) {
  if (
    route.providerId !== "huggingface" ||
    route.identifier !== "black-forest-labs/FLUX.1-schnell"
  )
    throw new AppError(
      400,
      "Model gambar Hugging Face belum didukung adapter ini.",
    );
  if (!/^hf_[A-Za-z0-9]+$/.test(route.secrets.apiKey || ""))
    throw new AppError(
      503,
      "Masukkan token Hugging Face yang lengkap dengan izin Inference Providers.",
    );
  const signal = AbortSignal.timeout(route.provider.timeoutMs);
  const safeFetch: typeof fetch = async (input, options) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (
      url.protocol !== "https:" ||
      !["huggingface.co", "router.huggingface.co"].includes(url.hostname) ||
      url.username ||
      url.password
    )
      throw new AppError(502, "Endpoint gambar tidak diizinkan.");
    return fetcher(input, { ...options, redirect: "error", signal });
  };
  try {
    const client = new InferenceClient(route.secrets.apiKey, {
      fetch: safeFetch,
      retry_on_error: false,
      signal,
    });
    const image = await client.textToImage(
      {
        provider: "nscale",
        model: route.identifier,
        inputs: prompt,
        parameters: { width, height, num_inference_steps: 4 },
      },
      { outputType: "blob" },
    );
    if (!image.size || image.size > 12 * 1024 * 1024)
      throw new AppError(502, "Ukuran keluaran gambar tidak valid.");
    return validateImageBytes(Buffer.from(await image.arrayBuffer()));
  } catch (error) {
    if (error instanceof AppError) throw error;
    const status = (error as { httpResponse?: { status?: number } })
      ?.httpResponse?.status;
    if (status === 402 || status === 429)
      throw new AppError(
        429,
        "Kredit percobaan atau kuota Hugging Face habis. Generasi dihentikan; tidak ada pembelian kredit otomatis.",
      );
    if (status === 401 || status === 403)
      throw new AppError(
        503,
        "Token Hugging Face ditolak. Periksa izin Inference Providers dan akses model.",
      );
    throw new AppError(
      502,
      "Hugging Face belum menghasilkan gambar. Periksa status model, kuota, dan timeout.",
    );
  }
}
export function validateImageBytes(bytes: Buffer) {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { bytes, mime: "image/png", ext: "png" };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { bytes, mime: "image/jpeg", ext: "jpg" };
  throw new AppError(
    502,
    "Provider tidak mengembalikan file PNG atau JPEG yang valid.",
  );
}
