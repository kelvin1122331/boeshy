import { AppError } from "./errors";
export async function readBytes(
  request: Request,
  max = 500000,
): Promise<Buffer> {
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "Data permintaan kosong.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new AppError(413, "Permintaan terlalu besar.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function readJSON(
  request: Request,
  max = 500000,
): Promise<unknown> {
  const bytes = await readBytes(request, max);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new AppError(400, "Format permintaan tidak valid.");
  }
}
