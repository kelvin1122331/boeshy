import { expect, test, vi } from "vitest";
import {
  huggingFaceImage,
  validateImageBytes,
} from "@/lib/ai/huggingface-image";
import type { ModelRoute } from "@/server/admin/router";
const model = "black-forest-labs/FLUX.1-schnell";
const route = {
  providerId: "huggingface",
  identifier: model,
  secrets: { apiKey: "hf_testonlytoken" },
  provider: { timeoutMs: 5000 },
} as unknown as ModelRoute;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cL1kAAAAASUVORK5CYII=",
  "base64",
);
function mockFetch(status = 200) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "huggingface.co")
      return Response.json({
        inferenceProviderMapping: {
          nscale: { status: "live", providerId: model, task: "text-to-image" },
        },
      });
    if (status !== 200)
      return Response.json(
        { error: "upstream raw secret must never be forwarded" },
        { status },
      );
    return Response.json({ data: [{ b64_json: png.toString("base64") }] });
  });
}
test("HF adapter produces actual returned bytes through pinned Nscale routing, without retry or redirects", async () => {
  const fetcher = mockFetch();
  const result = await huggingFaceImage(
    route,
    "A panda astronaut",
    1024,
    1024,
    fetcher,
  );
  expect(result.bytes).toEqual(png);
  expect(result.mime).toBe("image/png");
  const generation = fetcher.mock.calls.find(([url]) =>
    String(url).includes("router.huggingface.co"),
  );
  expect(generation).toBeTruthy();
  expect(String(generation![0])).toContain("/nscale/");
  expect(generation![1]?.redirect).toBe("error");
});
test("HF quota failures are safe and are not retried", async () => {
  const fetcher = mockFetch(402);
  await expect(
    huggingFaceImage(route, "test", 1024, 1024, fetcher),
  ).rejects.toThrow("Kredit percobaan");
  expect(
    fetcher.mock.calls.filter(([url]) =>
      String(url).includes("router.huggingface.co"),
    ),
  ).toHaveLength(1);
});
test("invalid HF credentials and unsupported model never call network; non-image output is rejected", async () => {
  const fetcher = mockFetch();
  await expect(
    huggingFaceImage(
      { ...route, secrets: { apiKey: "wrong" } },
      "test",
      1024,
      1024,
      fetcher,
    ),
  ).rejects.toThrow("token Hugging Face");
  await expect(
    huggingFaceImage(
      { ...route, identifier: "arbitrary/model" },
      "test",
      1024,
      1024,
      fetcher,
    ),
  ).rejects.toThrow("belum didukung");
  expect(fetcher).not.toHaveBeenCalled();
  expect(() =>
    validateImageBytes(Buffer.from("<html>not an image</html>")),
  ).toThrow("PNG atau JPEG");
});
