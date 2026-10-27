import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
test("interactive ABCDE exam saves answers, submits and displays a real computed review", async ({
  page,
}) => {
  const origin = process.env.APP_URL || "http://localhost:3000",
    email = `exam-ui-${Date.now()}@holyai.test`;
  await page.request.post("/api/auth/sign-up/email", {
    headers: { Origin: origin },
    data: { name: "Exam QA", email, password: "Testing-holyai-12345" },
  });
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  try {
    const exam = await db.exam.create({
      data: {
        userId: user.id,
        title: "ABCDE interface QA",
        mode: "exam",
        material: "Explicit QA fixture, not AI-generated content.",
        questions: {
          create: Array.from({ length: 5 }, (_, position) => ({
            position,
            topic: "Counting",
            prompt: `Choose option ${position + 1}`,
            options: ["One", "Two", "Three", "Four", "Five"],
            correctIndex: position,
            explanation: `The required option is ${position + 1}.`,
          })),
        },
      },
    });
    await page.goto(`/study-exam/${exam.id}`);
    await page.getByRole("button", { name: "Mulai ujian" }).click();
    for (let i = 0; i < 5; i++) {
      await expect(
        page.getByRole("heading", { name: `Choose option ${i + 1}` }),
      ).toBeVisible();
      expect(await page.getByRole("radio").count()).toBe(5);
      await page.getByRole("radio").nth(i).click();
      await expect(page.getByRole("radio").nth(i)).toBeChecked();
      if (i < 4) await page.getByRole("button", { name: "Berikutnya" }).click();
    }
    await page.getByRole("button", { name: "Kirim jawaban" }).click();
    await expect(page).toHaveURL(/\/results\?attempt=/);
    await expect(page.locator(".results-score")).toContainText("100");
    await expect(page.locator(".review-question")).toHaveCount(5);
    await expect(page.locator(".review-wrong")).toHaveCount(0);
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
