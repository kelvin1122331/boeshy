import { db } from "@/lib/database";
import { featureStates } from "@/server/admin/router";
import { initializeAdmin } from "@/server/admin/configuration";
export async function capabilities() {
  await initializeAdmin();
  const [states, models, canva] = await Promise.all([
    featureStates(),
    db.aIModel.findMany({
      where: {
        enabled: true,
        provider: { enabled: true, credential: { isNot: null } },
      },
      include: { provider: { select: { id: true } } },
    }),
    db.providerConfiguration.findUnique({
      where: { id: "canva" },
      include: { credential: { select: { providerId: true } } },
    }),
  ]);
  const ready = (id: string) =>
    states.some(
      (f) =>
        f.id === id && f.status !== "disabled" && f.dependencies.length === 0,
    );
  const media = (cap: string) =>
    models.find(
      (m) =>
        m.id === states.find((f) => f.id === `${cap}-generator`)?.model?.id,
    );
  const image = media("image"),
    video = media("video");
  const imageSettings = image?.settings as
      { imageRatios?: string[] } | undefined,
    videoSettings = video?.settings as
      { videoRatios?: string[]; videoDurations?: number[] } | undefined;
  return {
    text: ready("chat"),
    image: ready("image-generator"),
    video: ready("video-generator"),
    search: ready("deep-search"),
    academic: ready("academic-research"),
    local: ready("task-manager"),
    storage: !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID),
    queue: !!process.env.REDIS_URL,
    canva: !!(
      canva?.enabled &&
      canva.credential &&
      process.env.TOKEN_ENCRYPTION_KEY
    ),
    email: !!process.env.RESEND_API_KEY,
    google: !!process.env.GOOGLE_CLIENT_ID,
    models: ready("chat")
      ? models
          .filter(
            (m) =>
              m.capabilities.includes("text") &&
              (!states.find((f) => f.id === "chat")?.config.primaryModelId ||
                m.id ===
                  states.find((f) => f.id === "chat")?.config.primaryModelId),
          )
          .map((m) => ({ id: m.id, name: m.name }))
      : [],
    imageRatios: imageSettings?.imageRatios?.length
      ? imageSettings.imageRatios
      : ["1:1", "3:2", "2:3"],
    videoRatios: videoSettings?.videoRatios?.length
      ? videoSettings.videoRatios
      : ["16:9", "9:16"],
    videoDurations: videoSettings?.videoDurations?.length
      ? videoSettings.videoDurations
      : [4, 8, 12],
    imageEditing: false,
    imageToVideo: false,
    negativePrompt: false,
    featureStatus: Object.fromEntries(
      states.map((f) => [
        f.id,
        {
          enabled: f.config.enabled,
          ready: f.config.enabled && !f.dependencies.length,
          status: f.status,
        },
      ]),
    ),
  };
}
