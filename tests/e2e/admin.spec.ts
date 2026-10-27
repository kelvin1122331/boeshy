import { test, expect } from "@playwright/test";
import { PrismaClient, Prisma } from "@prisma/client";
import { createHmac } from "node:crypto";
import { adminSections } from "../../src/config/admin";
const db = new PrismaClient();
const origin = process.env.APP_URL || "http://localhost:3000";
test.setTimeout(180000);
test.afterAll(() => db.$disconnect());
test("admin permissions, all routes, encrypted credential lifecycle, feature persistence and MFA", async ({
  page,
}) => {
  const request = page.request;
  const email = `admin-qa-${Date.now()}@holyai.test`;
  const password = "Testing-holyai-12345";
  const post = (path: string, data: unknown = {}) =>
    request.post(`/api/admin/${path}`, { headers: { Origin: origin }, data });
  let registered = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: origin },
    data: { name: "Admin QA", email, password },
  });
  if (registered.status() === 429) {
    await new Promise((r) => setTimeout(r, 11000));
    registered = await request.post("/api/auth/sign-up/email", {
      headers: { Origin: origin },
      data: { name: "Admin QA", email, password },
    });
  }
  expect(registered.status()).toBe(200);
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const feature = await db.featureConfiguration.findUniqueOrThrow({
    where: { id: "task-manager" },
  });
  const original = await db.providerConfiguration.findUniqueOrThrow({
    where: { id: "gemini" },
  });
  const publicProvider = await db.providerConfiguration.findUniqueOrThrow({
    where: { id: "arbeitnow" },
  });
  // Never overwrite credentials belonging to a configured live provider.
  expect(
    await db.providerCredential.findUnique({ where: { providerId: "gemini" } }),
  ).toBeNull();
  try {
    expect((await request.get("/api/admin/providers")).status()).toBe(403);
    expect((await page.goto("/admin"))?.status()).toBe(404);
    await db.user.update({ where: { id: user.id }, data: { role: "support" } });
    expect((await request.get("/api/admin/overview")).status()).toBe(200);
    expect((await request.get("/api/admin/providers")).status()).toBe(403);
    expect(
      (
        await post("settings", {
          key: "notifications",
          value: { enabled: false, thresholdPercent: 80 },
        })
      ).status(),
    ).toBe(403);
    await db.user.update({
      where: { id: user.id },
      data: { role: "super_admin" },
    });
    expect((await post("providers/arbeitnow/disable")).status()).toBe(200);
    const disabledProviders = await (
      await request.get("/api/admin/providers")
    ).json();
    expect(
      disabledProviders.find((p: { id: string }) => p.id === "arbeitnow")
        .enabled,
    ).toBe(false);
    const dependencies = await (
      await request.get("/api/admin/features")
    ).json();
    expect(
      dependencies.find((f: { id: string }) => f.id === "career-matcher")
        .dependencies,
    ).toContain("Job Search Service");
    expect((await post("providers/arbeitnow/enable")).status()).toBe(200);
    for (const section of adminSections) {
      const response = await page.goto(`/admin/${section.id}`);
      expect(response?.status(), section.id).toBe(200);
      await expect(page.locator(".acc-page-heading h1")).toHaveText(
        section.name,
      );
      await expect(page.locator(".acc-content")).not.toContainText(
        "Memuat data aktual…",
        { timeout: 15000 },
      );
      await expect(page.locator(".acc-content [role=alert]")).toHaveCount(0);
    }
    const secret = "qa-disabled-secret-FIRST1234",
      rotated = "qa-disabled-secret-SECOND5678";
    const configuration = {
      authMethod: "api_key",
      endpoint: original.endpoint,
      enabled: false,
      defaultModel: null,
      timeoutMs: 30000,
      retryAttempts: 0,
      requestLimit: 30,
      priority: 10,
      settings: {},
      credentials: { apiKey: secret },
    };
    await page.goto("/admin/api-credentials");
    await page.getByLabel("Cari provider").fill("Google Gemini");
    await page.getByRole("button", { name: "Configure", exact: true }).click();
    await page.getByLabel("Gemini API Key").fill(secret);
    await page
      .getByRole("button", { name: "Save Configuration", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Konfigurasi disimpan dengan aman." }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({
      path: "test-results/admin-credentials.png",
      fullPage: true,
    });
    const read = await request.get("/api/admin/providers");
    expect(read.headers()["cache-control"]).toBe("no-store");
    expect(await read.text()).not.toContain(secret);
    const encrypted = await db.providerCredential.findUniqueOrThrow({
      where: { providerId: "gemini" },
    });
    expect(encrypted.ciphertext).not.toContain(secret);
    expect(
      (
        await post("providers/gemini/rotate", {
          ...configuration,
          credentials: { apiKey: rotated },
        })
      ).status(),
    ).toBe(200);
    const rows = await (await request.get("/api/admin/providers")).json();
    const gemini = rows.find((p: { id: string }) => p.id === "gemini");
    expect(gemini.credential.version).toBe(2);
    expect(gemini.credential.masked.apiKey).toBe("••••••••5678");
    expect(JSON.stringify(rows)).not.toContain(rotated);
    expect(
      (
        await post("providers/gemini", {
          ...configuration,
          endpoint: "http://127.0.0.1/",
        })
      ).status(),
    ).toBe(400);
    expect((await post("providers/gemini/delete-credentials")).status()).toBe(
      200,
    );
    const {
      id: _id,
      updatedAt: _date,
      lastError: _error,
      ...featureInput
    } = feature;
    void _id;
    void _date;
    void _error;
    expect(
      (
        await post("features/task-manager", { ...featureInput, enabled: false })
      ).status(),
    ).toBe(200);
    const features = await (await request.get("/api/admin/features")).json();
    expect(
      features.find((f: { id: string }) => f.id === "task-manager").status,
    ).toBe("disabled");
    expect((await post("features/task-manager", featureInput)).status()).toBe(
      200,
    );
    await page.goto("/admin/overview");
    await expect(page.locator(".acc-metric").first()).toBeVisible();
    await page.screenshot({
      path: "test-results/admin-overview.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Ganti tema admin" }).click();
    await page.screenshot({
      path: "test-results/admin-mobile.png",
      fullPage: true,
    });
    const setup = await (await post("security/mfa-setup")).json();
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bits = [...(setup.secret as string)]
      .map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0"))
      .join("");
    const key = Buffer.from(
      Array.from({ length: Math.floor(bits.length / 8) }, (_, i) =>
        parseInt(bits.slice(i * 8, i * 8 + 8), 2),
      ),
    );
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const digest = createHmac("sha1", key).update(counter).digest(),
      offset = digest[digest.length - 1] & 15;
    const code = ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
      .toString()
      .padStart(6, "0");
    const verified = await post("security/mfa-verify", { code });
    expect(verified.status()).toBe(200);
    const recovery = await verified.json();
    expect(recovery.recoveryCodes).toHaveLength(8);
    await db.adminMfaGrant.deleteMany({ where: { userId: user.id } });
    expect((await request.get("/api/admin/providers")).status()).toBe(428);
    expect((await post("security/mfa-verify", { code })).status()).toBe(400);
    expect(
      (
        await post("security/mfa-verify", { code: recovery.recoveryCodes[0] })
      ).status(),
    ).toBe(200);
    expect((await request.get("/api/admin/providers")).status()).toBe(200);
    expect((await post("security/mfa-disable")).status()).toBe(200);
    await db.user.update({ where: { id: user.id }, data: { role: "user" } });
    expect((await request.get("/api/admin/overview")).status()).toBe(403);
  } finally {
    await db.providerCredential.deleteMany({ where: { providerId: "gemini" } });
    await db.providerConfiguration.update({
      where: { id: "gemini" },
      data: {
        ...original,
        settings: original.settings as Prisma.InputJsonValue,
      },
    });
    await db.providerConfiguration.update({
      where: { id: "arbeitnow" },
      data: {
        ...publicProvider,
        settings: publicProvider.settings as Prisma.InputJsonValue,
      },
    });
    await db.featureConfiguration.update({
      where: { id: "task-manager" },
      data: feature,
    });
    await db.auditLog.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});
