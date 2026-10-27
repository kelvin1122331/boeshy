import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const password = "Testing-holyai-12345";
test.setTimeout(120000);
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { endsWith: "@holyai.test" } } });
  await db.$disconnect();
});
async function register(
  request: import("@playwright/test").APIRequestContext,
  label: string,
) {
  const email = `${label}-${Date.now()}@holyai.test`;
  const options={
    headers: { Origin: process.env.APP_URL || "http://localhost:3000" },
    data: { name: "QA Tester", email, password },
  };
  let r=await request.post('/api/auth/sign-up/email',options);
  if(r.status()===429){await new Promise(resolve=>setTimeout(resolve,11000));r=await request.post('/api/auth/sign-up/email',options);}
  expect(r.status()).toBe(200);
  return email;
}
test("real registration, authenticated routes, task CRUD, projects and mobile layout", async ({
  page,
  request,
}) => {
  const email = await register(request, "workspace");
  await page.goto("/login");
  await page.getByLabel("Alamat email").fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk ke workspace" }).click();
  await expect(page).toHaveURL("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Ide besar dimulai di sini." }),
  ).toBeVisible();
  for (const route of [
    "chat",
    "image-generator",
    "video-generator",
    "presentation-studio",
    "deep-search",
    "book-creator",
    "academic-research",
    "notes-summarizer",
    "paraphrase",
    "study-exam",
    "academic-document",
    "task-manager",
    "defense-simulator",
    "career-matcher",
    "journal-matrix",
    "methodology-checker",
    "rubric-checker",
    "originality-checker",
  ]) {
    const response = await page.goto("/" + route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
  }
  await page.goto("/task-manager");
  await page.getByRole("button", { name: "Tugas baru", exact: true }).click();
  await page.getByLabel("Judul tugas").fill("Write literature review");
  await page.getByRole("button", { name: "Simpan tugas" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Tugas tersimpan." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Write literature review" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Write literature review" }),
  ).toBeVisible();
  await page.getByLabel("Selesaikan Write literature review").check();
  await expect(page.locator(".task-row")).toHaveClass(/task-done/);
  await page.goto("/projects");
  await page.getByRole("button", { name: "Proyek baru", exact: true }).click();
  await page.getByLabel("Nama proyek").fill("Education research");
  await page.getByRole("button", { name: "Simpan proyek" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Education research" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Ide besar dimulai di sini." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.app-main')).toHaveCSS('margin-left','260px');
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
    animations:'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/mobile-open/);
  await page.screenshot({
    path: "test-results/mobile-navigation.png",
    fullPage: true,
  });
});
test("ownership checks, CSRF, admin protection and no exam answer leakage before submission", async ({
  request,
  browser,
}) => {
  const email = await register(request, "security");
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const exam = await db.exam.create({
    data: {
      userId: user.id,
      title: "Security test exam",
      mode: "exam",
      material: "QA fixture; not generated AI output",
      questions: {
        create: Array.from({ length: 5 }, (_, position) => ({
          position,
          topic: "Math",
          prompt: `Question ${position + 1}`,
          options: ["A", "B", "C", "D", "E"],
          correctIndex: position,
          explanation: `Correct option ${position + 1}`,
        })),
      },
    },
  });
  const before = await request.get(`/api/workspace/exams/${exam.id}`);
  const personal = await (
    await request.get("/api/workspace/privacy/me/export")
  ).json();
  expect(
    personal.exams.find((e: { id: string }) => e.id === exam.id).questions[0],
  ).not.toHaveProperty("correctIndex");
  const raw = await before.text();
  expect(raw).not.toContain("correctIndex");
  expect(raw).not.toContain("explanation");
  const attempt = await (
    await request.post(`/api/workspace/exams/${exam.id}/attempts`, {
      headers: { Origin: process.env.APP_URL || "http://localhost:3000" },
      data: {},
    })
  ).json();
  const data = JSON.parse(raw);
  for (const [i, q] of data.questions.entries())
    await request.patch(
      `/api/workspace/exams/${exam.id}/attempts/${attempt.id}`,
      {
        headers: { Origin: process.env.APP_URL || "http://localhost:3000" },
        data: { questionId: q.id, selectedIndex: i },
      },
    );
  const submitted = await request.post(
    `/api/workspace/exams/${exam.id}/attempts/${attempt.id}`,
    {
      headers: { Origin: process.env.APP_URL || "http://localhost:3000" },
      data: {},
    },
  );
  const result = await submitted.json();
  expect(result.result.score).toBe(100);
  expect(result.review[0].correctIndex).toBe(0);
  const rewrite = await request.patch(
    `/api/workspace/exams/${exam.id}/attempts/${attempt.id}`,
    {
      headers: { Origin: process.env.APP_URL || "http://localhost:3000" },
      data: { questionId: data.questions[0].id, selectedIndex: 4 },
    },
  );
  expect(rewrite.status()).toBe(409);
  const other = await browser.newContext();
  await register(other.request, "other");
  expect(
    (await other.request.get(`/api/workspace/exams/${exam.id}`)).status(),
  ).toBe(404);
  expect((await other.request.get("/api/workspace/admin")).status()).toBe(403);
  expect(
    (
      await other.request.post("/api/workspace/tasks", {
        headers: { Origin: "https://evil.example" },
        data: { title: "CSRF" },
      })
    ).status(),
  ).toBe(403);
  await other.close();
});
