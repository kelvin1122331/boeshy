import "dotenv/config";
import { test, expect } from "vitest";
import { QueueEvents } from "bullmq";
import { db } from "@/lib/database";
import { connection, ensureRedis, jobsQueue } from "@/lib/queue";
test.skipIf(process.env.RUN_INFRA_TESTS !== "true")(
  "worker creates one real deadline notification and does not duplicate it",
  async () => {
    await ensureRedis();
    const user = await db.user.create({
      data: { name: "Queue QA", email: `queue-${Date.now()}@holyai.test` },
    });
    const task = await db.task.create({
      data: {
        userId: user.id,
        title: "Queue integration fixture",
        dueAt: new Date(Date.now() + 3600000),
      },
    });
    const events = new QueueEvents("holyai", { connection: connection() });
    await events.waitUntilReady();
    try {
      for (let n = 0; n < 2; n++) {
        const job = await jobsQueue().add(
          "maintenance",
          {},
          { removeOnComplete: true },
        );
        await job.waitUntilFinished(events, 15000);
      }
      const notifications = await db.notification.findMany({
        where: { userId: user.id },
      });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toContain(task.title);
      expect(
        (await db.task.findUniqueOrThrow({ where: { id: task.id } }))
          .remindedAt,
      ).not.toBeNull();
    } finally {
      await db.user.delete({ where: { id: user.id } });
      await events.close();
      await jobsQueue().close();
      await connection().quit();
      await db.$disconnect();
    }
  },
);
