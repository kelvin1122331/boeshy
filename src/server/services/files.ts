import { AppError } from "@/lib/errors";
import { db } from "@/lib/database";
import { getFile } from "@/lib/storage";
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export function validateFile(
  name: string,
  mime: string,
  size: number,
  bytes: Buffer,
) {
  if (size > MAX_FILE_SIZE || size === 0)
    throw new AppError(400, "File harus berukuran 1 byte–10 MB.");
  const ext = name.toLowerCase().split(".").pop();
  const valid =
    (ext === "txt" &&
      ["text/plain", "application/octet-stream", ""].includes(mime) &&
      !bytes.includes(0)) ||
    (ext === "pdf" &&
      mime === "application/pdf" &&
      bytes.subarray(0, 5).toString() === "%PDF-") ||
    (ext === "docx" &&
      mime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b) ||
    (ext === "png" &&
      mime === "image/png" &&
      bytes.subarray(0, 4).equals(Buffer.from([137, 80, 78, 71]))) ||
    (["jpg", "jpeg"].includes(ext || "") &&
      mime === "image/jpeg" &&
      bytes[0] === 255 &&
      bytes[1] === 216) ||
    (ext === "webp" &&
      mime === "image/webp" &&
      bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP");
  if (!valid)
    throw new AppError(
      400,
      "Format atau isi file tidak sesuai. Gunakan PDF, DOCX, TXT, PNG, JPEG, atau WebP.",
    );
}
export async function extractDocument(bytes: Buffer, mime: string) {
  if (mime.startsWith("image/"))
    return {
      text: "",
      pages: [],
      warning:
        "Gambar disimpan. Pembacaan visual memerlukan provider OpenAI aktif.",
    };
  if (mime === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try {
      const result = await parser.getText();
      const pages = result.pages.map((p) => ({ page: p.num, text: p.text }));
      const text = pages
        .map((p) => `[Halaman ${p.page}]\n${p.text}`)
        .join("\n\n");
      return {
        text: text.slice(0, 200000),
        pages,
        warning: !text.trim()
          ? "PDF tidak memiliki teks yang terbaca. Unggah versi teks atau gambar."
          : result.total > pages.filter((p) => p.text.trim()).length
            ? "Sebagian halaman tidak memiliki teks yang terbaca. OCR tidak diaktifkan."
            : text.length > 200000
              ? "Teks dibatasi 200.000 karakter. Pisahkan dokumen untuk memproses sisanya."
              : null,
      };
    } finally {
      await parser.destroy();
    }
  }
  if (mime.includes("wordprocessingml")) {
    const { default: JSZip } = await import("jszip");
    const archive = await JSZip.loadAsync(bytes);
    let expanded = 0;
    for (const entry of Object.values(archive.files)) {
      expanded +=
        (entry as unknown as { _data?: { uncompressedSize?: number } })._data
          ?.uncompressedSize || 0;
      if (expanded > 40 * 1024 * 1024)
        throw new AppError(
          413,
          "Isi DOCX melebihi batas aman 40 MB setelah diekstrak.",
        );
    }
    if (!archive.file("word/document.xml"))
      throw new AppError(400, "File bukan dokumen DOCX yang valid.");
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ buffer: bytes });
    return {
      text: r.value.slice(0, 200000),
      pages: [],
      warning: r.messages.length
        ? "Sebagian elemen dokumen tidak dapat diekstrak."
        : null,
    };
  }
  return {
    text: bytes.toString("utf8").slice(0, 200000),
    pages: [],
    warning: null,
  };
}
export async function materialContext(userId: string, fileIds: string[]) {
  const files = await db.projectFile.findMany({
    where: { id: { in: fileIds }, userId },
  });
  if (files.length !== new Set(fileIds).size)
    throw new AppError(
      404,
      "Sebagian file tidak ditemukan atau tidak dapat diakses.",
    );
  const parts = [];
  for (const f of files) {
    let text = f.text;
    if (f.mime.startsWith("image/")) {
      const { openai, safety, checkQuota } = await import("@/lib/ai/provider");
      await checkQuota(userId);
      const bytes = await getFile(f.key);
      const r = await openai().responses.create({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
        instructions: `${safety} Transcribe and describe only the visible study/document content. Mark uncertain OCR.`,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_image",
                image_url: `data:${f.mime};base64,${bytes.toString("base64")}`,
                detail: "auto",
              },
            ],
          },
        ],
        store: false,
      });
      text = r.output_text;
      await db.usageRecord.create({
        data: {
          userId,
          feature: "vision",
          provider: "openai",
          inputTokens: r.usage?.input_tokens || 0,
          outputTokens: r.usage?.output_tokens || 0,
        },
      });
    }
    if (!text.trim())
      throw new AppError(
        422,
        `${f.name}: teks tidak terbaca. Gunakan dokumen dengan teks yang dapat dipilih.`,
      );
    parts.push(
      `<document name=${JSON.stringify(f.name)}>\n${text}\n</document>`,
    );
  }
  if (parts.join("").length > 400000)
    throw new AppError(
      400,
      "Total materi terlalu panjang. Bagi menjadi beberapa pekerjaan.",
    );
  return parts.join("\n\n");
}
