import { test, expect } from "@playwright/test";
test.setTimeout(120000);
test("public links open dedicated pages, with working catalogue filters and home navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Satu AI.*Untuk Semua.*Kemungkinan/,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Jelajahi Semua Fitur", exact: true })
    .click();
  await expect(page).toHaveURL(/\/features$/);
  await expect(page.locator(".marketing-feature-card")).toHaveCount(18);
  await page.getByRole("button", { name: "Kreasi AI", exact: true }).click();
  await expect(page.locator(".marketing-feature-card")).toHaveCount(5);
  await expect(page).toHaveURL(/category=AI/);
  await page
    .getByRole("button", { name: "Semua kemampuan", exact: true })
    .click();
  await page.getByLabel("Cari kemampuan").fill("Journal Matrix");
  await expect(page.locator(".marketing-feature-card")).toHaveCount(1);
  await page.getByLabel("Cari kemampuan").fill("tidakadafiturini");
  await expect(
    page.getByRole("heading", { name: "Belum ada fitur yang cocok." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tampilkan semua", exact: true })
    .click();
  await expect(page.locator(".marketing-feature-card")).toHaveCount(18);
  const navigation = page.getByRole("navigation", {
    name: "Navigasi utama",
    exact: true,
  });
  await navigation
    .getByRole("link", { name: "Cara kerja", exact: true })
    .click();
  await expect(page).toHaveURL(/\/how-it-works$/);
  await expect(page.locator(".marketing-workflow>article")).toHaveCount(3);
  await navigation.getByRole("link", { name: "Privasi", exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByRole("heading", { name: "Ketahui ke mana materimu diproses." }),
  ).toBeVisible();
  await page.locator(".marketing-header .logo").click();
  await expect(page).toHaveURL(/\/$/);
  expect(new URL(page.url()).hash).toBe("");
  expect(errors).toEqual([]);
});
test("public pages fit desktop, tablet and mobile in both themes", async ({
  page,
}) => {
  for (const theme of ["light", "dark"]) {
    await page.addInitScript(
      (value) => localStorage.setItem("theme", value),
      theme,
    );
    for (const width of [1440, 988, 390]) {
      await page.setViewportSize({ width, height: 960 });
      for (const route of [
        "/",
        "/features",
        "/how-it-works",
        "/privacy",
        "/help",
      ]) {
        await page.goto(route);
        await expect(page.locator(".marketing-main h1")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (theme === "dark" && width === 988)
          await page.screenshot({
            path: `test-results/public-${route === "/" ? "home" : route.slice(1)}-dark.png`,
            fullPage: true,
            animations: "disabled",
          });
        if (theme === "light" && width === 1440 && route === "/")
          await page.screenshot({
            path: "test-results/public-home-light.png",
            fullPage: true,
            animations: "disabled",
          });
        if (theme === "dark" && width === 390 && route === "/")
          await page.screenshot({
            path: "test-results/public-home-mobile.png",
            fullPage: true,
            animations: "disabled",
          });
      }
    }
  }
});
test("mobile menu reaches every public page and exposes the current location", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();
  const menu = page.getByRole("navigation", { name: "Navigasi seluler" });
  await menu.getByRole("link", { name: "Fitur", exact: true }).click();
  await expect(page).toHaveURL(/\/features$/);
  await expect(
    page.getByRole("button", { name: "Buka menu", exact: true }),
  ).toBeVisible();
  for (const [label, path] of [
    ["Cara kerja", "/how-it-works"],
    ["Privasi", "/privacy"],
  ]) {
    await page.getByRole("button", { name: "Buka menu", exact: true }).click();
    await menu.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(path + "$"));
  }
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();
  await expect(
    menu.getByRole("link", { name: "Privasi", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("homepage search, theme and help controls work", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".showcase-feature-card")).toHaveCount(6);
  await expect(
    page.getByRole("link", { name: "Lihat Cara Kerja", exact: true }),
  ).toHaveAttribute("href", "/how-it-works");
  await expect(page.locator(".showcase-hero-visual img")).toBeVisible();
  expect(
    await page
      .locator(".showcase-hero-visual img")
      .evaluate(
        (image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth > 0,
      ),
  ).toBe(true);
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Cari kemampuan HOLYAI" });
  await expect(search).toBeVisible();
  await expect(search.getByLabel("Cari fitur", { exact: true })).toBeFocused();
  await search.getByLabel("Cari fitur", { exact: true }).fill("gambar");
  await expect(
    search.getByRole("link", { name: /Image Generator/ }),
  ).toBeVisible();
  await search
    .getByLabel("Cari fitur", { exact: true })
    .fill("tidakadafiturini");
  await expect(search.getByRole("status")).toHaveText(/Belum ada fitur/);
  await page.keyboard.press("Escape");
  await expect(search).not.toBeVisible();
  await page.getByRole("button", { name: "Ganti tema", exact: true }).click();
  await expect(page.locator(".showcase-header")).toHaveAttribute(
    "data-home-theme",
    "dark",
  );
  await page.getByRole("button", { name: "Ganti tema", exact: true }).click();
  await expect(page.locator(".showcase-header")).toHaveAttribute(
    "data-home-theme",
    "light",
  );
  await page
    .getByRole("link", { name: "Butuh bantuan?", exact: false })
    .click();
  await expect(page).toHaveURL(/\/help$/);
  await page
    .getByText("Bagaimana cara mulai menggunakan HOLYAI?", { exact: true })
    .click();
  await expect(page.locator(".marketing-faq details").first()).toHaveAttribute(
    "open",
    "",
  );
  await expect(
    page
      .locator(".marketing-faq details")
      .first()
      .getByText(/Buat akun melalui/),
  ).toBeVisible();
});
