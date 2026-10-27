import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const createdEmails: string[] = [];
test.setTimeout(90000);
test.afterAll(async () => {
  if (createdEmails.length)
    await db.user.deleteMany({ where: { email: { in: createdEmails } } });
  await db.$disconnect();
});

test("space authentication pages fit desktop, tablet and mobile in either app theme", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(
      (value) => localStorage.setItem("theme", value),
      theme,
    );
    for (const width of [1536, 988, 390]) {
      await page.setViewportSize({
        width,
        height: width === 1536 ? 1024 : 960,
      });
      for (const route of [
        "login",
        "register",
        "forgot-password",
        "reset-password",
      ]) {
        const response = await page.goto(`/${route}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator("#auth-title")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const background = page.locator(".cosmos-background img");
        await expect(background).toBeVisible();
        await expect
          .poll(() =>
            background.evaluate(
              (image) => (image as HTMLImageElement).naturalWidth,
            ),
          )
          .toBeGreaterThan(0);
        if (
          theme === "light" &&
          (route === "login" || route === "register") &&
          width !== 988
        ) {
          await page.screenshot({
            path: `test-results/auth-${route}-${width === 390 ? "mobile" : "desktop"}.png`,
            fullPage: true,
            animations: "disabled",
          });
        }
      }
    }
  }
  expect(errors).toEqual([]);
});

test("real signup and login still work with the new form and password visibility control", async ({
  page,
}) => {
  const email = `auth-design-${Date.now()}@holyai.test`;
  createdEmails.push(email);
  const password = "Auth-design-test-13579";
  await page.goto("/register");
  await page.getByLabel("Nama lengkap", { exact: true }).fill("Auth Design QA");
  await page.getByLabel("Alamat email", { exact: true }).fill(email);
  const passwordField = page.getByLabel("Kata sandi", { exact: true });
  await passwordField.fill(password);
  await expect(passwordField).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Tampilkan kata sandi", exact: true })
    .click();
  await expect(passwordField).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Sembunyikan kata sandi", exact: true })
    .click();
  await expect(passwordField).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Alamat email", { exact: true }).fill(email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("wrong-password-12345");
  await page
    .getByRole("button", { name: "Masuk ke workspace", exact: true })
    .click();
  await expect(page.locator(".cosmos-panel").getByRole("alert")).toContainText(
    "Email, kata sandi, atau status verifikasi belum sesuai.",
  );
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Masuk ke workspace", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Ide besar dimulai di sini." }),
  ).toBeVisible();
});

test("recovery feedback, unavailable social providers and mobile navigation stay usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Microsoft", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Apple", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigasi seluler HOLYAI" })
    .getByRole("link", { name: "Bantuan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/help$/);
  await page.goto("/login");
  await page
    .getByRole("link", { name: "Lupa kata sandi?", exact: true })
    .click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  const recoveryButton = page.getByRole("button", {
    name: "Kirim tautan pemulihan",
    exact: true,
  });
  if (await recoveryButton.isDisabled())
    await expect(page.getByRole("status")).toContainText(
      "Pemulihan akun lewat email belum tersedia",
    );
  await page.goto("/reset-password");
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("Replacement-test-12345");
  await page
    .getByRole("button", { name: "Simpan kata sandi", exact: true })
    .click();
  await expect(page.locator(".cosmos-panel").getByRole("alert")).toHaveText(
    /Tautan pemulihan tidak valid/,
  );
});
