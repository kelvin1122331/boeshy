import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
test("private upload, real object download, ownership, spoofed-file rejection and deletion", async ({
  request,
  browser,
}) => {
  test.skip(
    !process.env.S3_ENDPOINT,
    "A configured test-only S3 endpoint is required.",
  );
  const origin = process.env.APP_URL || "http://localhost:3000";
  const email = `storage-${Date.now()}@holyai.test`,
    password = "Testing-holyai-12345";
  const register = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: origin },
    data: { name: "Storage QA", email, password },
  });
  expect(register.ok()).toBeTruthy();
  let fileId = "";
  try {
    const upload = await request.post("/api/upload", {
      headers: { Origin: origin },
      multipart: {
        file: {
          name: "notes.txt",
          mimeType: "text/plain",
          buffer: Buffer.from(
            "Private source material for the upload integration test.",
          ),
        },
      },
    });
    expect(upload.status()).toBe(200);
    fileId = (await upload.json()).id;
    const link = await (
      await request.get(`/api/workspace/files/${fileId}`)
    ).json();
    const content = await request.get(link.url);
    expect(await content.text()).toContain("Private source material");
    const anonymous = await browser.newContext();
    expect(
      (await anonymous.request.get(`/api/workspace/files/${fileId}`)).status(),
    ).toBe(401);
    const unsigned = new URL(link.url);
    unsigned.search = "";
    expect((await anonymous.request.get(unsigned.toString())).status()).toBe(
      403,
    );
    await anonymous.close();
    const other = await browser.newContext();
    const signup = await other.request.post("/api/auth/sign-up/email", {
      headers: { Origin: origin },
      data: {
        name: "Other QA",
        email: `other-storage-${Date.now()}@holyai.test`,
        password,
      },
    });
    expect(signup.ok()).toBeTruthy();
    expect(
      (await other.request.get(`/api/workspace/files/${fileId}`)).status(),
    ).toBe(404);
    await other.close();
    const spoof = await request.post("/api/upload", {
      headers: { Origin: origin },
      multipart: {
        file: {
          name: "fake.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("not a PDF"),
        },
      },
    });
    expect(spoof.status()).toBe(400);
    expect(
      (
        await request.delete(`/api/workspace/files/${fileId}`, {
          headers: { Origin: origin },
        })
      ).ok(),
    ).toBeTruthy();
    expect((await request.get(`/api/workspace/files/${fileId}`)).status()).toBe(
      404,
    );
  } finally {
    if (fileId)
      await request.delete(`/api/workspace/files/${fileId}`, {
        headers: { Origin: origin },
      });
    await db.user.deleteMany({
      where: { email: { endsWith: "@holyai.test" } },
    });
    await db.$disconnect();
  }
});
