import { resolveModel, resolveStoredModel } from "@/server/admin/router";
import type { GenerationJob } from "@prisma/client";
import { openaiFor, reserveUsage } from "@/lib/ai/provider";
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
    const snapshot = await tx.generationJob.findUnique({
      where: { id: job.id },
      select: { result: true },
    });
    await tx.generationJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        stage: "completed",
        result: {
          ...((snapshot?.result as Record<string, string>) || {}),
          title: (job.input as { prompt: string }).prompt,
        },
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
  const { route } = await resolveModel(job.kind, undefined, "image");
  const allowed = (route.settings as { imageRatios?: string[] }).imageRatios;
  if (
    allowed?.length &&
    !allowed.includes(String(input.options.ratio || "1:1"))
  )
    throw new AppError(400, "Rasio tidak didukung model pilihan.");
  const usage = await reserveUsage(
    job.userId,
    job.kind,
    route.providerId,
    route.identifier,
  );
  await db.generationJob.update({
    where: { id: job.id },
    data: { result: { usageId: usage.id, modelId: route.id } },
  });
  const r = await openaiFor(route).images.generate({
    model: route.identifier,
    prompt: `${input.prompt}\nStyle: ${input.options.style || "Photorealistic"}`,
    size,
    n: 1,
  });
  const data = r.data?.[0]?.b64_json;
  if (!data)
    throw new AppError(502, "Provider belum mengembalikan file gambar.");
  await finishAsset(job, Buffer.from(data, "base64"), "image/png", "png");
  await db.usageRecord.update({
    where: { id: usage.id },
    data: { status: "completed" },
  });
}
export async function generateVideo(
  job: GenerationJob,
  input: GenerationInput,
) {
  const savedModel = (job.result as { modelId?: string } | null)?.modelId;
  const route =
    job.providerId && savedModel
      ? await resolveStoredModel(savedModel, "video")
      : (await resolveModel(job.kind, undefined, "video")).route;
  const client = openaiFor(route);
  let providerId = job.providerId;
  if (!providerId) {
    const duration = Number(input.options.duration || 4);
    const options = route.settings as {
      videoDurations?: number[];
      videoRatios?: string[];
    };
    if (
      options.videoRatios?.length &&
      !options.videoRatios.includes(String(input.options.ratio || "16:9"))
    )
      throw new AppError(400, "Rasio tidak didukung model video pilihan.");
    if (
      !(
        options.videoDurations?.length ? options.videoDurations : [4, 8, 12]
      ).includes(duration)
    )
      throw new AppError(400, "Durasi tidak didukung.");
    const usage = await reserveUsage(
      job.userId,
      job.kind,
      route.providerId,
      route.identifier,
    );
    await db.generationJob.update({
      where: { id: job.id },
      data: { result: { usageId: usage.id, modelId: route.id } },
    });
    const r = await client.videos.create({
      model: route.identifier,
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
  const state = await db.generationJob.findUnique({
    where: { id: job.id },
    select: { result: true },
  });
  const usageId = (state?.result as { usageId?: string } | null)?.usageId;
  if (usageId)
    await db.usageRecord.update({
      where: { id: usageId },
      data: { status: "completed" },
    });
  return { pending: false };
}
