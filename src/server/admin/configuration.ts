import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/database";
import { AppError } from "@/lib/errors";
import {
  providers,
  providerById,
  credentialFields,
  type AuthMethod,
  type Capability,
} from "@/config/providers";
import { features } from "@/config/features";
import { encryptSecret, decryptSecret, maskSecrets } from "./secrets";

let initialization: Promise<unknown> | undefined;
export async function initializeAdmin() {
  if (!initialization)
    initialization = db
      .$transaction([
        db.providerConfiguration.createMany({
          data: providers.map((p) => ({
            id: p.id,
            authMethod: p.auth[0],
            endpoint: p.endpoint,
            enabled: !!p.publicAccess,
            connectionStatus: p.publicAccess ? "available" : "not_configured",
          })),
          skipDuplicates: true,
        }),
        db.featureConfiguration.createMany({
          data: features.map((f) => ({ id: f.id })),
          skipDuplicates: true,
        }),
      ])
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  await initialization;
}
export function validateEndpoint(id: string, endpoint: string) {
  const definition = providerById(id);
  if (!definition) throw new AppError(404, "Provider tidak ditemukan.");
  if (id !== "custom") {
    if (endpoint !== definition.endpoint)
      throw new AppError(
        400,
        "Gunakan endpoint resmi provider yang sudah diizinkan.",
      );
    return endpoint;
  }
  const allowed = (process.env.AI_ENDPOINT_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new AppError(400, "Endpoint custom tidak valid.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    !allowed.includes(endpoint) ||
    /^(localhost|.*\.localhost|.*\.local|\[|\d)/i.test(url.hostname)
  )
    throw new AppError(
      400,
      "Endpoint custom harus HTTPS dan tercantum persis pada allowlist deployment.",
    );
  return endpoint;
}
const identifier = z
  .string()
  .trim()
  .min(1)
  .max(150)
  .regex(/^[a-zA-Z0-9_.:/-]+$/, "Model identifier tidak valid.");
export const providerSchema = z
  .object({
    authMethod: z.enum([
      "api_key",
      "bearer",
      "oauth2",
      "client_credentials",
      "service_account",
      "public",
    ]),
    endpoint: z.string().max(300),
    enabled: z.boolean().optional(),
    defaultModel: identifier.nullable().optional(),
    timeoutMs: z.number().int().min(1000).max(120000),
    retryAttempts: z.number().int().min(0).max(2),
    requestLimit: z.number().int().min(1).max(10000),
    priority: z.number().int().min(1).max(100),
    revision: z.number().int().min(1).optional(),
    credentials: z.record(z.string(), z.string().max(20000)).default({}),
    settings: z
      .object({
        maxResults: z.number().int().min(1).max(50).optional(),
        contactEmail: z.email().or(z.literal("")).optional(),
        scopes: z.array(z.string().max(200)).max(30).optional(),
        countries: z
          .array(z.string().regex(/^[a-z]{2}$/))
          .max(30)
          .optional(),
        defaultCountry: z
          .string()
          .regex(/^[a-z]{2}$/)
          .optional(),
        visionModel: identifier.optional(),
        maxDuration: z.number().int().min(1).max(120).optional(),
        concurrency: z.number().int().min(1).max(20).optional(),
        webhookEnabled: z.boolean().optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
export const modelSchema = z
  .object({
    id: z.string().uuid().optional(),
    providerId: z.string().max(60),
    identifier,
    name: z.string().trim().min(1).max(100),
    capabilities: z
      .array(
        z.enum([
          "text",
          "structured",
          "vision",
          "image",
          "image_edit",
          "video",
          "audio_input",
          "audio_output",
          "embeddings",
          "tools",
        ]),
      )
      .min(1)
      .max(10),
    contextLimit: z
      .number()
      .int()
      .positive()
      .max(100000000)
      .nullable()
      .optional(),
    inputType: z.enum(["text", "text,image", "audio", "multimodal"]),
    outputType: z.enum(["text", "image", "video", "audio"]),
    enabled: z.boolean(),
    inputCostPerMillion: z.number().min(0).max(100000).nullable().optional(),
    outputCostPerMillion: z.number().min(0).max(100000).nullable().optional(),
    settings: z
      .object({
        imageRatios: z
          .array(z.enum(["1:1", "3:2", "2:3"]))
          .max(3)
          .optional(),
        videoRatios: z
          .array(z.enum(["16:9", "9:16"]))
          .max(2)
          .optional(),
        videoDurations: z
          .array(z.union([z.literal(4), z.literal(8), z.literal(12)]))
          .max(3)
          .optional(),
        outputFormats: z
          .array(z.enum(["png", "mp4"]))
          .max(2)
          .optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
export const featureSchema = z
  .object({
    enabled: z.boolean(),
    primaryModelId: z.string().uuid().nullable(),
    secondaryModelId: z.string().uuid().nullable(),
    fallbackEnabled: z.boolean(),
    fallbackConsent: z.boolean(),
    timeoutMs: z.number().int().min(1000).max(120000),
    retryAttempts: z.number().int().min(0).max(2),
    monthlyLimit: z.number().int().min(0).max(1000000),
    queueEnabled: z.boolean(),
  })
  .strict();
export async function saveProvider(
  actorId: string,
  id: string,
  raw: unknown,
  rotate = false,
) {
  await initializeAdmin();
  const definition = providerById(id);
  if (!definition) throw new AppError(404, "Provider tidak ditemukan.");
  const input = providerSchema.parse(raw);
  if (!definition.auth.includes(input.authMethod))
    throw new AppError(400, "Metode autentikasi tidak didukung provider ini.");
  validateEndpoint(id, input.endpoint);
  const allowedFields = credentialFields(definition, input.authMethod);
  if (
    Object.keys(input.credentials).some(
      (field) => !Object.hasOwn(allowedFields, field),
    )
  )
    throw new AppError(
      400,
      "Field kredensial tidak sesuai metode autentikasi.",
    );
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ProviderConfiguration" WHERE id=${id} FOR UPDATE`;
    const current = await tx.providerConfiguration.findUniqueOrThrow({
      where: { id },
      include: { credential: true },
    });
    if (input.revision && current.revision !== input.revision)
      throw new AppError(
        409,
        "Konfigurasi berubah. Muat ulang sebelum menyimpan.",
      );
    const previous =
      current.credential && current.authMethod === input.authMethod
        ? decryptSecret<Record<string, string>>(
            current.credential.ciphertext,
            `provider:${id}`,
          )
        : {};
    const supplied = Object.fromEntries(
      Object.entries(input.credentials).filter(
        ([, value]) => value.trim().length,
      ),
    );
    if (rotate && !Object.keys(supplied).length)
      throw new AppError(400, "Isi kredensial baru untuk melakukan rotasi.");
    const secrets = { ...previous, ...supplied };
    if (input.authMethod === "service_account" && secrets.serviceAccount) {
      try {
        const value = JSON.parse(secrets.serviceAccount);
        if (!value.private_key || !value.client_email) throw new Error();
      } catch {
        throw new AppError(400, "Service account JSON belum valid.");
      }
    }
    const complete =
      Object.keys(allowedFields).every((field) => !!secrets[field]) ||
      (!!definition.optionalKey && input.authMethod === "public");
    if (input.enabled && !complete)
      throw new AppError(
        400,
        "Lengkapi kredensial sebelum mengaktifkan provider.",
      );
    if (Object.keys(supplied).length) {
      const ciphertext = encryptSecret(secrets, `provider:${id}`),
        masked = maskSecrets(secrets);
      await tx.providerCredential.upsert({
        where: { providerId: id },
        create: { providerId: id, ciphertext, masked },
        update: { ciphertext, masked, version: { increment: 1 } },
      });
    } else if (current.authMethod !== input.authMethod && current.credential)
      await tx.providerCredential.delete({ where: { providerId: id } });
    const status = complete
      ? definition.publicAccess && input.authMethod === "public"
        ? "available"
        : "configured"
      : "not_configured";
    await tx.providerConfiguration.update({
      where: { id },
      data: {
        authMethod: input.authMethod,
        endpoint: input.endpoint,
        enabled: input.enabled ?? current.enabled,
        defaultModel: input.defaultModel || null,
        timeoutMs: input.timeoutMs,
        retryAttempts: input.retryAttempts,
        requestLimit: input.requestLimit,
        priority: input.priority,
        settings: input.settings,
        connectionStatus: status,
        checkedAt: null,
        latencyMs: null,
        errorCode: null,
        safeMessage: null,
        revision: { increment: 1 },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: rotate ? "admin.credentials.rotated" : "admin.provider.saved",
        resourceId: id,
        metadata: { credentialChanged: Object.keys(supplied).length > 0 },
      },
    });
    return { ok: true };
  });
}
export async function providerRuntime(id: string) {
  await initializeAdmin();
  const config = await db.providerConfiguration.findUnique({
    where: { id },
    include: { credential: true },
  });
  if (!config) return null;
  validateEndpoint(id, config.endpoint);
  return {
    ...config,
    definition: providerById(id)!,
    secrets: config.credential
      ? decryptSecret<Record<string, string>>(
          config.credential.ciphertext,
          `provider:${id}`,
        )
      : {},
  };
}
export async function listProviders() {
  await initializeAdmin();
  const configs = await db.providerConfiguration.findMany({
    include: {
      credential: { select: { masked: true, version: true, updatedAt: true } },
      models: true,
    },
    orderBy: { priority: "asc" },
  });
  return configs.map((config) => {
    const definition = providerById(config.id)!;
    const masks = (config.credential?.masked || {}) as Record<string, string>;
    const complete =
      config.authMethod === "public" ||
      Object.keys(
        credentialFields(definition, config.authMethod as AuthMethod),
      ).every((field) => !!masks[field]);
    return {
      ...config,
      definition,
      configured: complete,
      status:
        !config.enabled && complete ? "disabled" : config.connectionStatus,
      canTest: complete,
      credential: config.credential
        ? {
            masked: config.credential.masked,
            version: config.credential.version,
            updatedAt: config.credential.updatedAt,
          }
        : null,
      redirectUri:
        config.id === "canva"
          ? process.env.CANVA_REDIRECT_URI ||
            `${process.env.APP_URL}/api/integrations/canva/callback`
          : config.id === "google"
            ? `${process.env.APP_URL}/api/integrations/google/callback`
            : null,
    };
  });
}
export async function setProviderEnabled(
  actorId: string,
  id: string,
  enabled: boolean,
) {
  await initializeAdmin();
  const config = await db.providerConfiguration.findUnique({
    where: { id },
    include: { credential: true },
  });
  if (!config) throw new AppError(404, "Provider tidak ditemukan.");
  if (
    enabled &&
    config.authMethod !== "public" &&
    (!config.credential ||
      !Object.keys(
        credentialFields(providerById(id)!, config.authMethod as AuthMethod),
      ).every(
        (field) =>
          !!(config.credential!.masked as Record<string, string>)[field],
      ))
  )
    throw new AppError(400, "Simpan kredensial sebelum mengaktifkan provider.");
  await db.$transaction([
    db.providerConfiguration.update({
      where: { id },
      data: { enabled, revision: { increment: 1 } },
    }),
    db.auditLog.create({
      data: {
        userId: actorId,
        action: enabled ? "admin.provider.enabled" : "admin.provider.disabled",
        resourceId: id,
      },
    }),
  ]);
  return { ok: true };
}
export async function deleteCredential(actorId: string, id: string) {
  await initializeAdmin();
  return db.$transaction(async (tx) => {
    await tx.providerCredential.deleteMany({ where: { providerId: id } });
    await tx.providerConfiguration.update({
      where: { id },
      data: {
        enabled: false,
        connectionStatus: "not_configured",
        checkedAt: null,
        latencyMs: null,
        errorCode: null,
        safeMessage: null,
        revision: { increment: 1 },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "admin.credentials.revoked",
        resourceId: id,
      },
    });
    return { ok: true };
  });
}
export async function saveModel(actorId: string, raw: unknown) {
  await initializeAdmin();
  const input = modelSchema.parse(raw);
  const definition = providerById(input.providerId);
  if (
    !definition ||
    input.capabilities.some((cap) => !definition.capabilities.includes(cap))
  )
    throw new AppError(
      400,
      "Capability belum didukung adapter provider tersebut.",
    );
  if (
    (input.capabilities.includes("image") && input.outputType !== "image") ||
    (input.capabilities.includes("video") && input.outputType !== "video")
  )
    throw new AppError(400, "Jenis keluaran tidak sesuai capability.");
  if (
    input.enabled &&
    input.capabilities.includes("image") &&
    !input.settings.imageRatios?.length
  )
    throw new AppError(
      400,
      "Pilih rasio yang didukung model gambar sebelum mengaktifkan.",
    );
  if (
    input.enabled &&
    input.capabilities.includes("video") &&
    (!input.settings.videoDurations?.length ||
      !input.settings.videoRatios?.length)
  )
    throw new AppError(
      400,
      "Pilih rasio dan durasi video yang didukung sebelum mengaktifkan.",
    );
  const { id, ...data } = input;
  const model = await db.aIModel.upsert({
    where: { id: id || crypto.randomUUID() },
    create: data,
    update: data,
  });
  await db.auditLog.create({
    data: {
      userId: actorId,
      action: "admin.model.saved",
      resourceId: model.id,
    },
  });
  return model;
}
export function featureCapability(id: string): Capability | null {
  const f = features.find((f) => f.id === id);
  return !f || id === "task-manager"
    ? null
    : id === "academic-research"
      ? "academic"
      : f.capability === "image"
        ? "image"
        : f.capability === "video"
          ? "video"
          : "text";
}
export async function saveFeature(actorId: string, id: string, raw: unknown) {
  await initializeAdmin();
  if (!features.some((f) => f.id === id))
    throw new AppError(404, "Fitur tidak ditemukan.");
  const input = featureSchema.parse(raw);
  if (
    input.fallbackEnabled &&
    (!input.fallbackConsent || !input.secondaryModelId)
  )
    throw new AppError(
      400,
      "Fallback memerlukan model cadangan dan persetujuan kebijakan pengiriman data.",
    );
  if (input.primaryModelId && input.primaryModelId === input.secondaryModelId)
    throw new AppError(400, "Model cadangan harus berbeda dari model utama.");
  const cap = featureCapability(id);
  if (input.fallbackEnabled && cap !== "text")
    throw new AppError(
      400,
      "Fallback saat ini tersedia untuk generasi teks. Media tidak dialihkan otomatis.",
    );
  if (["image", "video"].includes(cap || "") && input.retryAttempts > 0)
    throw new AppError(
      400,
      "Generasi media berbayar tidak diulang otomatis. Gunakan retry 0.",
    );
  for (const modelId of [input.primaryModelId, input.secondaryModelId].filter(
    Boolean,
  )) {
    const model = await db.aIModel.findUnique({ where: { id: modelId! } });
    if (!model || !model.enabled || (cap && !model.capabilities.includes(cap)))
      throw new AppError(
        400,
        "Pilih model aktif dengan capability yang sesuai.",
      );
  }
  await db.$transaction([
    db.featureConfiguration.update({ where: { id }, data: input }),
    db.auditLog.create({
      data: {
        userId: actorId,
        action: "admin.feature.saved",
        resourceId: id,
        metadata: {
          enabled: input.enabled,
          fallbackEnabled: input.fallbackEnabled,
        },
      },
    }),
  ]);
  return { ok: true };
}
export async function setting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.systemSetting.findUnique({ where: { key } });
  return row ? (row.value as T) : fallback;
}
export async function writeSetting(
  actorId: string,
  key: string,
  value: Prisma.InputJsonValue,
) {
  await db.$transaction([
    db.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    }),
    db.auditLog.create({
      data: {
        userId: actorId,
        action: "admin.settings.saved",
        resourceId: key,
      },
    }),
  ]);
  return { ok: true };
}
