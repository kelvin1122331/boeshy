import { beforeEach, expect, test, vi } from "vitest";
import { db } from "@/lib/database";
import { providerRuntime } from "@/server/admin/configuration";
import {
  defaultModel,
  resolveModel,
  fallbackModel,
} from "@/server/admin/router";
import type {
  AIModel,
  ProviderConfiguration,
  FeatureConfiguration,
} from "@prisma/client";
vi.mock("@/lib/database", () => ({
  db: {
    featureConfiguration: { findUnique: vi.fn() },
    aIModel: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  },
}));
vi.mock("@/server/admin/configuration", () => ({
  initializeAdmin: vi.fn(),
  providerRuntime: vi.fn(),
  setting: vi.fn(),
  featureCapability: vi.fn(),
}));
const model = (id: string, priority = 10) =>
  ({
    id,
    providerId: "gemini",
    identifier: id,
    name: id,
    enabled: true,
    capabilities: ["text"],
    createdAt: new Date(0),
    provider: {
      id: "gemini",
      enabled: true,
      priority,
      defaultModel: null,
      connectionStatus: "configured",
    },
  }) as unknown as AIModel & { provider: ProviderConfiguration };
const config = {
  id: "chat",
  enabled: true,
  primaryModelId: null,
  secondaryModelId: null,
  fallbackEnabled: false,
  fallbackConsent: false,
} as FeatureConfiguration;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(db.featureConfiguration.findUnique).mockResolvedValue(config);
  vi.mocked(providerRuntime).mockResolvedValue({
    definition: { adapter: "gemini" },
    authMethod: "api_key",
    credential: {},
    secrets: { apiKey: "mock-only" },
  } as unknown as Awaited<ReturnType<typeof providerRuntime>>);
});
test("default routing respects priority and configured identifier instead of substituting another model", () => {
  const a = model("preferred", 1),
    b = model("other", 2);
  expect(defaultModel([b, a], "text")?.id).toBe("preferred");
  a.provider.defaultModel = "missing-model";
  expect(defaultModel([a, b], "text")).toBeNull();
  expect(defaultModel([b], "image")).toBeNull();
});
test("disabled feature and missing models fail closed", async () => {
  vi.mocked(db.featureConfiguration.findUnique).mockResolvedValue({
    ...config,
    enabled: false,
  });
  await expect(resolveModel("chat")).rejects.toMatchObject({ status: 403 });
  vi.mocked(db.featureConfiguration.findUnique).mockResolvedValue(config);
  vi.mocked(db.aIModel.findMany).mockResolvedValue([]);
  await expect(resolveModel("chat")).rejects.toMatchObject({ status: 503 });
});
test("assigned model cannot be overridden by user and disabled providers cannot route", async () => {
  const selected = model("assigned");
  vi.mocked(db.featureConfiguration.findUnique).mockResolvedValue({
    ...config,
    primaryModelId: "assigned",
  });
  vi.mocked(db.aIModel.findUnique).mockResolvedValue(selected);
  await expect(resolveModel("chat", "different")).rejects.toMatchObject({
    status: 400,
  });
  selected.provider.enabled = false;
  await expect(resolveModel("chat")).rejects.toMatchObject({ status: 503 });
});
test("fallback requires explicit consent plus an enabled compatible model", async () => {
  const selected = model("backup");
  vi.mocked(db.aIModel.findUnique).mockResolvedValue(selected);
  const fallback = {
    ...config,
    secondaryModelId: "backup",
    fallbackEnabled: true,
  };
  expect(await fallbackModel(fallback, "text")).toBeNull();
  expect(db.aIModel.findUnique).not.toHaveBeenCalled();
  expect(
    (await fallbackModel({ ...fallback, fallbackConsent: true }, "text"))?.id,
  ).toBe("backup");
  expect(
    await fallbackModel({ ...fallback, fallbackConsent: true }, "image"),
  ).toBeNull();
});
