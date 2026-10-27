import { describe, it, expect } from "vitest";
import {
  validateFile,
  MAX_FILE_SIZE,
  extractDocument,
} from "@/server/services/files";
describe("file validation", () => {
  it("rejects spoofed content, wrong types, oversized and empty files", () => {
    expect(() =>
      validateFile("report.pdf", "application/pdf", 5, Buffer.from("hello")),
    ).toThrow();
    expect(() =>
      validateFile(
        "test.exe",
        "application/octet-stream",
        2,
        Buffer.from("MZ"),
      ),
    ).toThrow();
    expect(() =>
      validateFile(
        "test.txt",
        "text/plain",
        MAX_FILE_SIZE + 1,
        Buffer.from("x"),
      ),
    ).toThrow();
    expect(() =>
      validateFile("test.txt", "text/plain", 0, Buffer.alloc(0)),
    ).toThrow();
  });
  it("accepts and parses plain text", async () => {
    expect(() =>
      validateFile("notes.txt", "text/plain", 5, Buffer.from("hello")),
    ).not.toThrow();
    expect(
      (await extractDocument(Buffer.from("hello"), "text/plain")).text,
    ).toBe("hello");
  });
});
