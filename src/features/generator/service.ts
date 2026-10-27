import type { GenerationJob } from "@prisma/client";
import { openai, reserveUsage } from "@/lib/ai/provider";
import { db } from "@/lib/database";
import { putFile } from "@/lib/storage";
import type { GenerationInput } from "@/lib/validation/schemas";
import { AppError } from "@/lib/errors";
async function finishAsset(
  job: GenerationJob,
  bytes: Buffer,
  mime: string,
  ext: string,
) {
  const key = `${job.userId}/generated/${job.id}.${ext}`;
  await putFile(key, bytes, mime);
  await db.$transaction(async (tx) => {
    await tx.generatedAsset.upsert({
      where: { key },
      create: { jobId: job.id, key, mime },
      update: {},
    });
    await tx.generationJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        stage: "completed",
        result: { title: (job.input as { prompt: string }).prompt },
      },
    });
    await tx.notification.create({
      data: {
        userId: job.userId,
        title:
          job.kind === "video-generator"
            ? "Video selesai dibuat"
            : "Gambar selesai dibuat",
        href: `/${job.kind}?job=${job.id}`,
      },
    });
  });
}
export async function generateImage(
  job: GenerationJob,
  input: GenerationInput,
) {
  const sizes: Record<string, "1024x1024" | "1536x1024" | "1024x1536"> = {
    "1:1": "1024x1024",
    "3:2": "1536x1024",
    "2:3": "1024x1536",
  };
  const size = sizes[String(input.options.ratio || "1:1")];
  if (!size) throw new AppError(400, "Rasio gambar tidak didukung model ini.");
  await reserveUsage(job.userId, job.kind, "openai");
  const r = await openai().images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    prompt: `${input.prompt}\nStyle: ${input.options.style || "Photorealistic"}`,
    size,
    n: 1,
  });
  const data = r.data?.[0]?.b64_json;
  if (!data)
    throw new AppError(502, "Provider belum mengembalikan file gambar.");
  await finishAsset(job, Buffer.from(data, "base64"), "image/png", "png");
}
export async function generateVideo(
  job: GenerationJob,
  input: GenerationInput,
) {
  const client = openai();
  let providerId = job.providerId;
  if (!providerId) {
    const duration = Number(input.options.duration || 4);
    if (![4, 8, 12].includes(duration))
      throw new AppError(400, "Durasi tidak didukung.");
    await reserveUsage(job.userId, job.kind, "openai");
    const r = await client.videos.create({
      model: process.env.OPENAI_VIDEO_MODEL || "sora-2",
      prompt: input.prompt,
      seconds: String(duration) as "4" | "8" | "12",
      size: input.options.ratio === "9:16" ? "720x1280" : "1280x720",
    });
    providerId = r.id;
    await db.generationJob.update({
      where: { id: job.id },
      data: { providerId, stage: r.status },
    });
  }
  const video = await client.videos.retrieve(providerId);
  await db.generationJob.update({
    where: { id: job.id },
    data: { stage: video.status },
  });
  if (video.status === "failed")
    throw new AppError(502, "Provider melaporkan generasi video gagal.");
  if (video.status !== "completed") return { pending: true };
  const content = await client.videos.downloadContent(providerId);
  await finishAsset(
    job,
    Buffer.from(await content.arrayBuffer()),
    "video/mp4",
    "mp4",
  );
  return { pending: false };
}
