import { providerRuntime } from "./configuration";
import { AppError } from "@/lib/errors";
export const googleScopes = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/presentations",
];
export const canvaScopes = [
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "asset:read",
  "asset:write",
];
export async function oauthApplication(provider: "canva" | "google") {
  const config = await providerRuntime(provider);
  if (
    !config?.enabled ||
    !config.secrets.clientId ||
    !config.secrets.clientSecret
  )
    throw new AppError(
      503,
      "Integrasi OAuth belum dikonfigurasi. Hubungi administrator.",
    );
  const allowed = provider === "google" ? googleScopes : canvaScopes;
  const requested = (config.settings as { scopes?: string[] }).scopes;
  const scopes = requested?.length
    ? requested
    : provider === "google"
      ? [googleScopes[0], googleScopes[1]]
      : canvaScopes;
  if (scopes.some((scope) => !allowed.includes(scope)))
    throw new AppError(400, "Scope OAuth tidak didukung connector ini.");
  return {
    clientId: config.secrets.clientId,
    clientSecret: config.secrets.clientSecret,
    scopes,
    redirectUri:
      provider === "canva"
        ? process.env.CANVA_REDIRECT_URI ||
          `${process.env.APP_URL}/api/integrations/canva/callback`
        : `${process.env.APP_URL}/api/integrations/google/callback`,
  };
}
