import { requireUser, assertOrigin } from "@/lib/auth/guard";
import { db } from "@/lib/database";
import { errorResponse, AppError } from "@/lib/errors";
import {
  validateFile,
  extractDocument,
  MAX_FILE_SIZE,
} from "@/server/services/files";
import { putFile, removeFile } from "@/lib/storage";
import { rateLimit } from "@/lib/queue";
import { readBytes } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let key: string | undefined;
  try {
    assertOrigin(request);
    const user = await requireUser();
    await rateLimit(`upload:${user.id}`, 10);
    if (
      Number(request.headers.get("content-length") || 0) >
      MAX_FILE_SIZE + 20000
    )
      throw new AppError(413, "File melebihi 10 MB.");
    const raw = await readBytes(request, MAX_FILE_SIZE + 20000);
    const form = await new Response(new Uint8Array(raw), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new AppError(400, "Pilih file untuk diunggah.");
    const buffer = Buffer.from(await file.arrayBuffer());
    validateFile(file.name, file.type, file.size, buffer);
    const total = await db.projectFile.aggregate({
      where: { userId: user.id },
      _sum: { size: true },
    });
    if ((total._sum.size || 0) + file.size > 200 * 1024 * 1024)
      throw new AppError(
        413,
        "Batas penyimpanan 200 MB tercapai. Hapus file yang tidak dibutuhkan.",
      );
    const extracted = await extractDocument(buffer, file.type);
    key = `${user.id}/uploads/${crypto.randomUUID()}`;
    await putFile(key, buffer, file.type);
    const result = await db.projectFile.create({
      data: {
        userId: user.id,
        name: file.name.slice(0, 200),
        mime: file.type,
        size: file.size,
        key,
        ...extracted,
      },
    });
    return Response.json({
      id: result.id,
      name: result.name,
      warning: result.warning,
    });
  } catch (error) {
    if (key) await removeFile(key).catch(() => {});
    return errorResponse(error);
  }
}
