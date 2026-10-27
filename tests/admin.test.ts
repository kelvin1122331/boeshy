import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  maskSecrets,
} from "@/server/admin/secrets";
import { hasPermission } from "@/lib/permissions";
import {
  validateEndpoint,
  providerSchema,
  modelSchema,
} from "@/server/admin/configuration";
import { probeProvider } from "@/server/admin/provider-tests";
import { totp } from "@/server/admin/mfa";
import { providers } from "@/config/providers";
import { callTextRoute } from "@/lib/ai/provider";
vi.mock("@/server/admin/access", () => ({ auditAdmin: vi.fn() }));
beforeEach(() => vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", "12".repeat(32)));
afterEach(() => vi.unstubAllEnvs());
describe("credential protection", () => {
  test("authenticated encryption is random, scoped, and tamper resistant", () => {
    const secret = { apiKey: "unit-test-secret-1234" };
    const a = encryptSecret(secret, "provider:gemini");
    expect(a).not.toContain(secret.apiKey);
    expect(a).not.toBe(encryptSecret(secret, "provider:gemini"));
    expect(decryptSecret(a, "provider:gemini")).toEqual(secret);
    expect(() => decryptSecret(a, "provider:openai")).toThrow();
    const broken = JSON.parse(a);
    broken.tag = Buffer.alloc(16).toString("base64");
    expect(() =>
      decryptSecret(JSON.stringify(broken), "provider:gemini"),
    ).toThrow();
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", "34".repeat(32));
    expect(() => decryptSecret(a, "provider:gemini")).toThrow();
  });
  test("missing master key fails closed and short secrets are completely masked", () => {
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", "");
    expect(() => encryptSecret({}, "test")).toThrow();
    expect(maskSecrets({ apiKey: "long-secret-ABCD", pin: "1234" })).toEqual({
      apiKey: "••••••••ABCD",
      pin: "••••••••",
    });
  });
});
test("permissions do not let ordinary users or support manage secrets or roles", () => {
  expect(hasPermission("user", "admin.read")).toBe(false);
  expect(hasPermission("support", "monitoring.read")).toBe(true);
  expect(hasPermission("support", "providers.read")).toBe(false);
  expect(hasPermission("admin", "roles.write")).toBe(false);
  expect(hasPermission("super_admin", "roles.write")).toBe(true);
  expect(hasPermission("unknown", "admin.read")).toBe(false);
});
test("provider endpoints reject substitution, internal URLs and non-allowlisted hosts", () => {
  expect(validateEndpoint("openai", "https://api.openai.com/v1")).toBeTruthy();
  expect(() => validateEndpoint("openai", "https://evil.example/v1")).toThrow();
  vi.stubEnv(
    "AI_ENDPOINT_ALLOWLIST",
    "https://localhost/v1,https://127.0.0.1/v1,https://allowed.example/v1",
  );
  for (const url of [
    "https://localhost/v1",
    "https://127.0.0.1/v1",
    "http://allowed.example/v1",
    "https://allowed.example/v1?key=secret",
  ])
    expect(() => validateEndpoint("custom", url)).toThrow();
  expect(validateEndpoint("custom", "https://allowed.example/v1")).toBeTruthy();
});
test("configuration schemas reject arbitrary settings and excessive retries", () => {
  expect(
    providerSchema.safeParse({
      authMethod: "api_key",
      endpoint: "https://api.openai.com/v1",
      timeoutMs: 30000,
      retryAttempts: 100,
      requestLimit: 30,
      priority: 10,
      settings: {},
    }).success,
  ).toBe(false);
  expect(
    modelSchema.safeParse({
      providerId: "openai",
      identifier: "bad model",
      name: "bad",
      capabilities: ["text"],
      inputType: "text",
      outputType: "text",
      enabled: false,
    }).success,
  ).toBe(false);
});
test("TOTP matches the RFC 6238 SHA1 vector truncated to six digits", () => {
  expect(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1)).toBe("287082");
});
function fixture(id: string) {
  const definition = providers.find((p) => p.id === id)!;
  return {
    id,
    endpoint: definition.endpoint,
    definition,
    timeoutMs: 1000,
    secrets: { apiKey: "test-only-key" },
    settings: {},
  } as unknown as Parameters<typeof probeProvider>[0];
}
test("connection probes use official endpoint and return only safe model metadata", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      models: [{ name: "models/test-model", displayName: "Test model" }],
      internal: "never-forward",
    }),
  );
  const result = await probeProvider(fixture("gemini"), fetcher);
  expect(fetcher.mock.calls[0][0]).toBe(
    "https://generativelanguage.googleapis.com/v1beta/models",
  );
  expect(result.status).toBe("connected");
  expect(result.models).toEqual([
    { identifier: "test-model", name: "Test model" },
  ]);
  expect(JSON.stringify(result)).not.toContain("never-forward");
});
test("failed probes redact upstream error bodies and unsupported probes never call network", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response("secret echoed by upstream", { status: 401 }),
    );
  const failed = await probeProvider(fixture("openai"), fetcher);
  expect(failed.code).toBe("HTTP_401");
  expect(JSON.stringify(failed)).not.toContain("secret echoed");
  fetcher.mockClear();
  expect((await probeProvider(fixture("canva"), fetcher)).status).toBe(
    "verification_unavailable",
  );
  expect(fetcher).not.toHaveBeenCalled();
});
test("Gemini adapter accepts only complete responses and sends schema/timeout without leaking keys", async () => {
  const config = fixture("gemini");
  const route = {
    ...config,
    providerId: "gemini",
    identifier: "test-model",
    provider: config,
  } as unknown as Parameters<typeof callTextRoute>[0];
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: '{"answer":42}' }] },
          },
        ],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 4 },
      }),
    );
  expect(
    await callTextRoute(
      route,
      "test",
      "input",
      { type: "object" },
      undefined,
      fetcher,
    ),
  ).toEqual({ text: '{"answer":42}', inputTokens: 3, outputTokens: 4 });
  const options = fetcher.mock.calls[0][1];
  expect(JSON.parse(options.body).generationConfig.responseMimeType).toBe(
    "application/json",
  );
  expect(options.redirect).toBe("error");
  fetcher.mockResolvedValue(
    Response.json({
      candidates: [
        {
          finishReason: "MAX_TOKENS",
          content: { parts: [{ text: "partial" }] },
        },
      ],
    }),
  );
  await expect(
    callTextRoute(route, "test", "input", undefined, undefined, fetcher),
  ).rejects.toThrow("belum selesai");
});
