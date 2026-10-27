import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import PptxGenJS from "pptxgenjs";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  slidesSchema,
  matrixSchema,
  rubricSchema,
} from "@/lib/validation/schemas";
import { AppError } from "@/lib/errors";
type Data = Record<string, unknown>;
export function textFromData(data: Data): string {
  const parts = [String(data.title || ""), String(data.summary || "")];
  if (Array.isArray(data.sections))
    for (const s of data.sections as { heading: string; body: string }[])
      parts.push(`\n${s.heading}\n${s.body}`);
  if (Array.isArray(data.slides))
    for (const s of data.slides as {
      title: string;
      bullets: string[];
      notes: string;
    }[])
      parts.push(`\n${s.title}\n${s.bullets.join("\n")}\n${s.notes}`);
  if (Array.isArray(data.journals))
    for (const j of data.journals as Data[])
      parts.push(
        Object.entries(j)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n"),
      );
  if (Array.isArray(data.criteria))
    for (const c of data.criteria as Data[])
      parts.push(
        Object.entries(c)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n"),
      );
  if (Array.isArray(data.sources))
    parts.push(
      "\nSumber",
      ...(data.sources as { title: string; url: string }[]).map(
        (s, i) => `[${i + 1}] ${s.title}\n${s.url}`,
      ),
    );
  if (Array.isArray(data.warnings) && data.warnings.length)
    parts.push("\nCatatan", ...(data.warnings as string[]));
  return parts.filter(Boolean).join("\n\n");
}
const escapeXML = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export async function exportDocument(
  format: string,
  data: Data,
): Promise<{ buffer: Buffer; mime: string; extension: string }> {
  const text = textFromData(data);
  let buffer: Buffer;
  let mime: string;
  if (format === "txt")
    return {
      buffer: Buffer.from(text),
      mime: "text/plain; charset=utf-8",
      extension: "txt",
    };
  if (format === "docx") {
    const doc = new Document({
      sections: [
        {
          children: text.split("\n").map(
            (line, i) =>
              new Paragraph({
                heading: i === 0 ? HeadingLevel.TITLE : undefined,
                children: [new TextRun(line)],
              }),
          ),
        },
      ],
    });
    buffer = await Packer.toBuffer(doc);
    mime =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (format === "pptx") {
    const d = slidesSchema.parse(data);
    const deck = new PptxGenJS();
    deck.layout = "LAYOUT_WIDE";
    deck.author = "HOLYAI";
    deck.subject = d.summary;
    deck.title = d.title;
    for (const [i, s] of d.slides.entries()) {
      const slide = deck.addSlide();
      slide.background = { color: "F8FAFC" };
      slide.addShape(deck.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 0.14,
        h: 7.5,
        fill: { color: "2563EB" },
        line: { color: "2563EB" },
      });
      slide.addText(s.title, {
        x: 0.65,
        y: 0.6,
        w: 11.8,
        h: 1.1,
        fontSize: 30,
        bold: true,
        color: "0F172A",
        breakLine: false,
      });
      slide.addText(
        s.bullets.map((b) => ({
          text: b,
          options: { bullet: { indent: 16 }, breakLine: true },
        })),
        {
          x: 0.8,
          y: 2,
          w: 11.3,
          h: 4.3,
          fontSize: 20,
          color: "334155",
          paraSpaceAfter: 18,
          fit: "shrink",
        },
      );
      slide.addText(`${i + 1} / ${d.slides.length}  ·  HOLYAI`, {
        x: 0.8,
        y: 7,
        w: 10,
        h: 0.2,
        fontSize: 10,
        color: "64748B",
      });
      slide.addNotes(`${s.notes}\n\nVisual suggestion: ${s.visual}`);
    }
    buffer = Buffer.from(
      (await deck.write({ outputType: "nodebuffer" })) as ArrayBuffer,
    );
    mime =
      "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  } else if (format === "xlsx") {
    const book = new ExcelJS.Workbook();
    book.creator = "HOLYAI";
    const sheet = book.addWorksheet("Matrix");
    const rows = matrixSchema.safeParse(data);
    const rubric = rubricSchema.safeParse(data);
    const entries = rows.success
      ? rows.data.journals
      : rubric.success
        ? rubric.data.criteria
        : null;
    if (!entries)
      throw new AppError(400, "XLSX tersedia untuk matriks jurnal dan rubrik.");
    const keys = Object.keys(entries[0]);
    sheet.addRow(keys);
    for (const entry of entries)
      sheet.addRow(keys.map((k) => (entry as Record<string, unknown>)[k]));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    sheet.columns.forEach((c) => {
      c.width = 30;
      c.alignment = { vertical: "top", wrapText: true };
    });
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: entries.length + 1, column: keys.length },
    };
    buffer = Buffer.from(await book.xlsx.writeBuffer());
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else if (format === "pdf") {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const font = await pdf.embedFont(
      await readFile(
        path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf"),
      ),
      { subset: true },
    );
    let page = pdf.addPage([595, 842]);
    let y = 790;
    for (const paragraph of text.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (font.widthOfTextAtSize(`${line} ${word}`, 11) > 490 && line) {
          page.drawText(line, {
            x: 50,
            y,
            size: 11,
            font,
            color: rgb(0.06, 0.09, 0.16),
          });
          y -= 17;
          line = word;
        } else line = line ? `${line} ${word}` : word;
        if (y < 55) {
          page = pdf.addPage([595, 842]);
          y = 790;
        }
      }
      if (line) page.drawText(line, { x: 50, y, size: 11, font });
      y -= 20;
      if (y < 55) {
        page = pdf.addPage([595, 842]);
        y = 790;
      }
    }
    buffer = Buffer.from(await pdf.save());
    mime = "application/pdf";
  } else if (format === "epub") {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.file(
      "META-INF/container.xml",
      '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    );
    const id = crypto.randomUUID();
    const title = escapeXML(String(data.title || "HOLYAI"));
    zip.file(
      "OEBPS/content.opf",
      `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:${id}</dc:identifier><dc:title>${title}</dc:title><dc:language>id</dc:language><meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="chapter"/></spine></package>`,
    );
    zip.file(
      "OEBPS/chapter.xhtml",
      `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" lang="id"><head><title>${title}</title></head><body>${text
        .split("\n")
        .map((p) => `<p>${escapeXML(p)}</p>`)
        .join("")}</body></html>`,
    );
    zip.file(
      "OEBPS/nav.xhtml",
      `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Daftar isi</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">${title}</a></li></ol></nav></body></html>`,
    );
    buffer = await zip.generateAsync({ type: "nodebuffer" });
    mime = "application/epub+zip";
  } else throw new AppError(400, "Format ekspor tidak didukung.");
  return { buffer, mime, extension: format };
}
export const exportFormat = z.enum([
  "txt",
  "docx",
  "pptx",
  "xlsx",
  "pdf",
  "epub",
]);
