import { encryptionReady } from "./secrets";
import type {
  AIModel,
  ProviderConfiguration,
  FeatureConfiguration,
} from "@prisma/client";
import { db } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { features } from "@/config/features";
import { type Capability } from "@/config/providers";
import {
  initializeAdmin,
  providerRuntime,
  setting,
  featureCapability,
} from "./configuration";
export const configurationMessage =
  "AI provider belum dikonfigurasi. Hubungi administrator.";
export type ModelRoute = AIModel & {
  provider: ProviderConfiguration;
  secrets: Record<string, string>;
};
export async function assertFeatureEnabled(id: string) {
  await initializeAdmin();
  const config = await db.featureConfiguration.findUnique({ where: { id } });
  if (!config?.enabled)
    throw new AppError(
      403,
      "Fitur ini sedang dinonaktifkan oleh administrator.",
    );
  return config;
}
async function routeFromModel(
  model: AIModel & { provider: ProviderConfiguration },
  capability: Capability,
): Promise<ModelRoute | null> {
  if (
    !model.enabled ||
    !model.capabilities.includes(capability) ||
    !model.provider.enabled ||
    model.provider.connectionStatus === "failed"
  )
    return null;
  const runtime = await providerRuntime(model.providerId);
  if (
    !runtime ||
    runtime.definition.adapter === "foundation" ||
    (runtime.authMethod !== "public" && !runtime.credential)
  )
    return null;
  return { ...model, secrets: runtime.secrets };
}
export function defaultModel<
  T extends AIModel & { provider: ProviderConfiguration },
>(models: T[], capability: Capability) {
  const available = models
    .filter((m) => m.capabilities.includes(capability))
    .sort(
      (a, b) =>
        a.provider.priority - b.provider.priority ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
  const first = available[0];
  if (!first) return null;
  return first.provider.defaultModel
    ? available.find(
        (m) =>
          m.providerId === first.providerId &&
          m.identifier === first.provider.defaultModel,
      ) || null
    : first;
}
export async function resolveModel(
  feature: string,
  requested?: string,
  capability: Capability = "text",
) {
  const config = await assertFeatureEnabled(feature);
  const selected = config.primaryModelId
    ? await db.aIModel.findUnique({
        where: { id: config.primaryModelId },
        include: { provider: true },
      })
    : defaultModel(
        await db.aIModel.findMany({
          where: {
            enabled: true,
            capabilities: { has: capability },
            provider: { enabled: true },
          },
          include: { provider: true },
          orderBy: [{ provider: { priority: "asc" } }, { createdAt: "asc" }],
        }),
        capability,
      );
  if (!selected) throw new AppError(503, configurationMessage);
  if (
    requested &&
    requested !== selected.providerId &&
    requested !== selected.id
  ) {
    if (config.primaryModelId)
      throw new AppError(
        400,
        "Model fitur ini sudah ditetapkan administrator.",
      );
    const alternative = await db.aIModel.findFirst({
      where: {
        enabled: true,
        capabilities: { has: capability },
        provider: { enabled: true },
        OR: [{ id: requested }, { providerId: requested }],
      },
      include: { provider: true },
    });
    if (!alternative) throw new AppError(400, "Model pilihan tidak tersedia.");
    const route = await routeFromModel(alternative, capability);
    if (!route) throw new AppError(503, configurationMessage);
    return { route, config };
  }
  const route = await routeFromModel(selected, capability);
  if (!route) throw new AppError(503, configurationMessage);
  return { route, config };
}
export async function fallbackModel(
  config: FeatureConfiguration,
  capability: Capability,
) {
  if (
    !config.fallbackEnabled ||
    !config.fallbackConsent ||
    !config.secondaryModelId
  )
    return null;
  const model = await db.aIModel.findUnique({
    where: { id: config.secondaryModelId },
    include: { provider: true },
  });
  return model ? routeFromModel(model, capability) : null;
}
export async function resolveStoredModel(id: string, capability: Capability) {
  const model = await db.aIModel.findUnique({
    where: { id },
    include: { provider: true },
  });
  const route = model ? await routeFromModel(model, capability) : null;
  if (!route) throw new AppError(503, configurationMessage);
  return route;
}
export async function resolveService(group: "search" | "academic" | "jobs") {
  await initializeAdmin();
  const preferred = await setting<string>(
    `primary.${group}`,
    group === "academic"
      ? "crossref"
      : group === "jobs"
        ? "arbeitnow"
        : "tavily",
  );
  const runtime = await providerRuntime(preferred);
  if (
    !runtime ||
    runtime.definition.group !== group ||
    !runtime.enabled ||
    runtime.connectionStatus === "failed" ||
    (runtime.authMethod !== "public" && !runtime.credential)
  )
    throw new AppError(503, configurationMessage);
  return runtime;
}
export async function featureStates() {
  await initializeAdmin();
  const [configs, models, providerConfigs] = await Promise.all([
    db.featureConfiguration.findMany(),
    db.aIModel.findMany({
      include: {
        provider: { include: { credential: { select: { providerId: true } } } },
      },
    }),
    db.providerConfiguration.findMany({
      include: { credential: { select: { providerId: true } } },
    }),
  ]);
  const activeModels = models.filter(
    (m) =>
      m.enabled &&
      m.provider.enabled &&
      (m.provider.authMethod === "public" ||
        (m.provider.credential && encryptionReady())) &&
      m.provider.connectionStatus !== "failed",
  );
  const primary = Object.fromEntries(
    await Promise.all(
      ["search", "academic", "jobs"].map(async (group) => [
        group,
        await setting(
          `primary.${group}`,
          group === "academic"
            ? "crossref"
            : group === "jobs"
              ? "arbeitnow"
              : "tavily",
        ),
      ]),
    ),
  );
  const serviceReady = (group: string) =>
    providerConfigs.some(
      (p) =>
        p.id === primary[group] &&
        p.enabled &&
        p.connectionStatus !== "failed" &&
        (p.authMethod === "public" || p.credential),
    );
  return features.map((feature) => {
    const config = configs.find((c) => c.id === feature.id)!;
    const cap = featureCapability(feature.id);
    const model = !cap
      ? undefined
      : config.primaryModelId
        ? activeModels.find(
            (m) =>
              m.id === config.primaryModelId &&
              (!cap || m.capabilities.includes(cap)),
          )
        : defaultModel(activeModels, cap);
    const dependencies: string[] = [];
    if (cap && cap !== "academic" && !model) dependencies.push(`${cap} model`);
    if (feature.id === "academic-research" && !serviceReady("academic"))
      dependencies.push("Academic Search Service");
    if (feature.id === "deep-search" && !serviceReady("search"))
      dependencies.push("Web Search Service");
    if (feature.id === "career-matcher" && !serviceReady("jobs"))
      dependencies.push("Job Search Service");
    if (
      !config.queueEnabled &&
      !["chat", "academic-research", "task-manager"].includes(feature.id)
    )
      dependencies.push("Background processing disabled");
    if (
      feature.capability !== "local" &&
      feature.id !== "chat" &&
      feature.id !== "academic-research" &&
      !process.env.REDIS_URL
    )
      dependencies.push("Background queue");
    if (
      ["image-generator", "video-generator"].includes(feature.id) &&
      !process.env.S3_BUCKET
    )
      dependencies.push("Private storage");
    const status = !config.enabled
      ? "disabled"
      : dependencies.length
        ? "configuration_required"
        : config.lastError
          ? "error"
          : "ready";
    return {
      id: feature.id,
      name: feature.name,
      icon: feature.icon,
      category: feature.category,
      capability: cap,
      config,
      dependencies,
      status,
      model: model
        ? { id: model.id, name: model.name, providerId: model.providerId }
        : null,
    };
  });
}
export async function assertFeatureReady(id: string) {
  const feature = (await featureStates()).find((f) => f.id === id);
  if (!feature) throw new AppError(404, "Fitur tidak ditemukan.");
  if (!feature.config.enabled)
    throw new AppError(
      403,
      "Fitur ini sedang dinonaktifkan oleh administrator.",
    );
  if (feature.dependencies.length)
    throw new AppError(503, configurationMessage);
  return feature.config;
}
