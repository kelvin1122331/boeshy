import "dotenv/config";
import { Worker } from "bullmq";
import { connection, jobsQueue, ensureRedis } from "@/lib/queue";
import { db } from "@/lib/database";
import { runGeneration } from "@/server/services/generation";
import { publicError } from "@/lib/errors";
await ensureRedis();
const worker = new Worker(
  "holyai",
  async (queueJob) => {
    if (queueJob.name === "maintenance") {
      const due = await db.task.findMany({
        where: {
          status: { not: "done" },
          remindedAt: null,
          dueAt: { gte: new Date(), lte: new Date(Date.now() + 86400000) },
        },
      });
      for (const t of due)
        await db.$transaction(async (tx) => {
          const claimed = await tx.task.updateMany({
            where: { id: t.id, remindedAt: null, status: { not: "done" } },
            data: { remindedAt: new Date() },
          });
          if (!claimed.count) return;
          await tx.notification.create({
            data: {
              userId: t.userId,
              title: `Tugas mendekati tenggat: ${t.title}`,
              href: "/task-manager",
            },
          });
        });
      await db.oAuthState.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      await db.verification.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      return;
    }
    const id = String(queueJob.data.id);
    try {
      const result = await runGeneration(id);
      if (result && "pending" in result && result.pending)
        await jobsQueue().add(
          "poll-video",
          { id },
          { delay: 15000, removeOnComplete: 100, removeOnFail: 100 },
        );
    } catch (error) {
      const e = publicError(error);
      await db.generationJob.update({
        where: { id },
        data: { status: "failed", stage: "failed", error: e.message },
      });
      throw new Error(e.message);
    }
  },
  {
    connection: connection(),
    concurrency: 3,
    limiter: { max: 20, duration: 60000 },
  },
);
await jobsQueue().upsertJobScheduler(
  "maintenance",
  { every: 60000 },
  {
    name: "maintenance",
    data: {},
    opts: { removeOnComplete: 10, removeOnFail: 10 },
  },
);
worker.on("failed", (job, error) =>
  console.error("Job failed", job?.id, error.message),
);
console.info("HOLYAI worker ready");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await worker.close();
    await jobsQueue().close();
    await connection().quit();
    await db.$disconnect();
    process.exit(0);
  });
