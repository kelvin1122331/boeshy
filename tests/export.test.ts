import { describe, it, expect } from "vitest";
import { exportDocument } from "@/server/services/export";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import ExcelJS from "exceljs";
describe("real export formats", () => {
  const data = {
    title: "HOLYAI test",
    summary: "Ringkasan dokumen",
    sections: [
      {
        heading: "Pendahuluan",
        body: "Materi pendidikan. Café dan naïve.\nHasil tidak direkayasa.",
      },
    ],
    warnings: [],
  };
  it("writes readable DOCX with OOXML document body", async () => {
    const r = await exportDocument("docx", data),
      zip = await JSZip.loadAsync(r.buffer);
    expect(await zip.file("word/document.xml")!.async("string")).toContain(
      "Materi pendidikan",
    );
  });
  it("writes a valid PDF with embedded font", async () => {
    const r = await exportDocument("pdf", data),
      pdf = await PDFDocument.load(r.buffer);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });
  it("writes valid PPTX slides and speaker notes", async () => {
    const r = await exportDocument("pptx", {
      title: "Presentasi",
      summary: "Summary",
      slides: [
        {
          title: "Slide one",
          bullets: ["First point", "Second point"],
          notes: "Speaker notes",
          visual: "Diagram",
        },
      ],
      references: [],
      warnings: [],
    });
    const zip = await JSZip.loadAsync(r.buffer);
    expect(zip.file("ppt/slides/slide1.xml")).toBeTruthy();
    expect(
      await zip.file("ppt/notesSlides/notesSlide1.xml")!.async("string"),
    ).toContain("Speaker notes");
  });
  it("writes an XLSX workbook for rubric criteria", async () => {
    const r = await exportDocument("xlsx", {
      title: "Rubric",
      summary: "Summary",
      criteria: [
        {
          name: "Arguments",
          weight: 100,
          score: 80,
          evidence: "Evidence",
          reason: "Reason",
          suggestion: "Improve",
        },
      ],
      warnings: [],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(r.buffer as never);
    expect(workbook.worksheets[0].getRow(2).getCell(1).value).toBe("Arguments");
  });
  it("writes EPUB package, navigation and actual content", async () => {
    const r = await exportDocument("epub", data),
      zip = await JSZip.loadAsync(r.buffer);
    expect(await zip.file("mimetype")!.async("string")).toBe(
      "application/epub+zip",
    );
    expect(await zip.file("OEBPS/content.opf")!.async("string")).toContain(
      "unique-identifier",
    );
    expect(await zip.file("OEBPS/chapter.xhtml")!.async("string")).toContain(
      "Materi pendidikan",
    );
  });
});
