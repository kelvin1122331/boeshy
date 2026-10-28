import type { NextConfig } from "next";
// Private media uses short-lived signed URLs. Permit only the configured local
// storage origin when development storage runs over HTTP on another port.
const storageOrigin = (() => {
  try {
    const url = new URL(process.env.S3_ENDPOINT || "");
    return url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      ? ` ${url.origin}`
      : "";
  } catch {
    return "";
  }
})();
const config: NextConfig = {
  serverExternalPackages: ["pdf-parse", "bullmq", "ioredis", "@prisma/client"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:${storageOrigin}; media-src 'self' blob: https:${storageOrigin}; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://www.canva.com`,
          },
        ],
      },
    ];
  },
};
export default config;
