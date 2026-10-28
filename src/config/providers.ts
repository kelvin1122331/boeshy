export const capabilityNames = {
  text: "Text Generation",
  structured: "Structured Output",
  vision: "Vision Input",
  image: "Image Generation",
  image_edit: "Image Editing",
  video: "Video Generation",
  audio_input: "Audio Input",
  audio_output: "Audio Output",
  embeddings: "Embeddings",
  tools: "Tool Calling",
  search: "Web Search",
  academic: "Academic Metadata",
  jobs: "Job Search",
  oauth: "Per-user OAuth",
} as const;
export type Capability = keyof typeof capabilityNames;
export type AuthMethod =
  | "api_key"
  | "bearer"
  | "oauth2"
  | "client_credentials"
  | "service_account"
  | "public";
export type ProviderDefinition = {
  id: string;
  name: string;
  group: string;
  description: string;
  icon: string;
  endpoint: string;
  auth: AuthMethod[];
  fields: Record<string, string>;
  capabilities: Capability[];
  adapter:
    | "openai"
    | "gemini"
    | "anthropic"
    | "tavily"
    | "brave"
    | "academic"
    | "jobs"
    | "canva"
    | "google"
    | "huggingface"
    | "foundation";
  optionalKey?: boolean;
  publicAccess?: boolean;
  docs: string;
  note?: string;
};
export const providers: ProviderDefinition[] = [
  {
    id: "huggingface",
    name: "Hugging Face",
    group: "ai",
    icon: "Image",
    description:
      "Gambar FLUX.1-schnell melalui Hugging Face dan Nscale. Kredit percobaan mengikuti akun Hugging Face.",
    endpoint: "https://router.huggingface.co/nscale",
    auth: ["api_key"],
    fields: { apiKey: "Hugging Face Token" },
    capabilities: ["image"],
    adapter: "huggingface",
    docs: "https://huggingface.co/docs/inference-providers/tasks/text-to-image",
    note: "Token memerlukan izin Inference Providers. Gunakan akun Free dengan kredit percobaan. Permintaan memakai saldo akun Hugging Face; HOLYAI tidak membeli kredit atau beralih ke OpenAI. Model: black-forest-labs/FLUX.1-schnell.",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    group: "ai",
    description: "Generasi teks dan keluaran terstruktur melalui Gemini API.",
    icon: "Sparkles",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    auth: ["api_key"],
    fields: { apiKey: "Gemini API Key" },
    capabilities: ["text", "structured", "vision"],
    adapter: "gemini",
    docs: "https://ai.google.dev/api/generate-content",
  },
  {
    id: "openai",
    name: "OpenAI",
    group: "ai",
    description: "Teks, gambar, dan pekerjaan video melalui adapter terpisah.",
    icon: "Aperture",
    endpoint: "https://api.openai.com/v1",
    auth: ["api_key"],
    fields: { apiKey: "OpenAI API Key" },
    capabilities: ["text", "structured", "vision", "image", "video"],
    adapter: "openai",
    docs: "https://developers.openai.com/api/reference/overview",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    group: "ai",
    description: "Alternatif generasi teks dan keluaran JSON yang divalidasi.",
    icon: "Asterisk",
    endpoint: "https://api.anthropic.com/v1",
    auth: ["api_key"],
    fields: { apiKey: "Anthropic API Key" },
    capabilities: ["text", "structured"],
    adapter: "anthropic",
    docs: "https://docs.anthropic.com/en/api/messages",
  },
  {
    id: "custom",
    name: "Custom Provider",
    group: "ai",
    description:
      "Fondasi adapter khusus. Format API harus dinyatakan dan diimplementasikan sebelum dapat digunakan.",
    icon: "Plug",
    endpoint: "",
    auth: [
      "api_key",
      "bearer",
      "oauth2",
      "client_credentials",
      "service_account",
      "public",
    ],
    fields: {},
    capabilities: [],
    adapter: "foundation",
    docs: "",
    note: "Endpoint hanya dari allowlist deployment. Tidak ada permintaan jaringan generik dari form ini.",
  },
  {
    id: "tavily",
    name: "Tavily",
    group: "search",
    description: "Pencarian web untuk riset dan sumber percakapan.",
    icon: "Orbit",
    endpoint: "https://api.tavily.com",
    auth: ["api_key"],
    fields: { apiKey: "Tavily API Key" },
    capabilities: ["search"],
    adapter: "tavily",
    docs: "https://docs.tavily.com/documentation/api-reference/endpoint/search",
  },
  {
    id: "brave",
    name: "Brave Search",
    group: "search",
    description: "Penyedia pencarian web alternatif.",
    icon: "Search",
    endpoint: "https://api.search.brave.com/res/v1",
    auth: ["api_key"],
    fields: { apiKey: "Brave API Key" },
    capabilities: ["search"],
    adapter: "brave",
    docs: "https://api-dashboard.search.brave.com/app/documentation/web-search/get-started",
  },
  {
    id: "crossref",
    name: "Crossref",
    group: "academic",
    description: "Metadata DOI dan publikasi dari REST API publik.",
    icon: "BookOpen",
    endpoint: "https://api.crossref.org",
    auth: ["public"],
    fields: {},
    capabilities: ["academic"],
    adapter: "academic",
    publicAccess: true,
    docs: "https://www.crossref.org/documentation/retrieve-metadata/rest-api/",
  },
  {
    id: "openalex",
    name: "OpenAlex",
    group: "academic",
    description:
      "Pencarian dasar publik; key opsional untuk akses dan anggaran yang lebih besar.",
    icon: "GraduationCap",
    endpoint: "https://api.openalex.org",
    auth: ["public", "api_key"],
    fields: { apiKey: "OpenAlex API Key (opsional)" },
    optionalKey: true,
    capabilities: ["academic"],
    adapter: "academic",
    publicAccess: true,
    docs: "https://help.openalex.org/api/authentication/",
    note: "Akses anonim dan paging dapat dibatasi oleh kebijakan OpenAlex. Periksa kembali saat mengaktifkan.",
  },
  {
    id: "semantic-scholar",
    name: "Semantic Scholar",
    group: "academic",
    description:
      "Connector metadata paper dengan akses sesuai kebijakan layanan.",
    icon: "Library",
    endpoint: "https://api.semanticscholar.org/graph/v1",
    auth: ["public", "api_key"],
    fields: { apiKey: "Semantic Scholar API Key (opsional)" },
    optionalKey: true,
    capabilities: ["academic"],
    adapter: "academic",
    publicAccess: true,
    docs: "https://api.semanticscholar.org/api-docs/graph",
  },
  {
    id: "canva",
    name: "Canva Connect",
    group: "canva",
    description:
      "Aplikasi OAuth untuk impor, ekspor, dan desain milik setiap pengguna.",
    icon: "Presentation",
    endpoint: "https://api.canva.com/rest/v1",
    auth: ["oauth2"],
    fields: {
      clientId: "Canva Client ID",
      clientSecret: "Canva Client Secret",
    },
    capabilities: ["oauth"],
    adapter: "canva",
    docs: "https://www.canva.dev/docs/connect/authentication/",
    note: "Autofill dapat memerlukan akses khusus. Ekspor PPTX internal tetap tersedia.",
  },
  {
    id: "google",
    name: "Google Services",
    group: "google",
    description:
      "Persetujuan per pengguna untuk Calendar, Drive, Docs, dan Slides.",
    icon: "CalendarDays",
    endpoint: "https://www.googleapis.com",
    auth: ["oauth2"],
    fields: {
      clientId: "Google Client ID",
      clientSecret: "Google Client Secret",
    },
    capabilities: ["oauth"],
    adapter: "google",
    docs: "https://developers.google.com/identity/protocols/oauth2/web-server",
  },
  {
    id: "adzuna",
    name: "Adzuna",
    group: "jobs",
    description:
      "Pencarian lowongan berdasarkan negara dan lokasi yang didukung provider.",
    icon: "BriefcaseBusiness",
    endpoint: "https://api.adzuna.com/v1/api",
    auth: ["client_credentials"],
    fields: { appId: "Application ID", appKey: "Application Key" },
    capabilities: ["jobs"],
    adapter: "jobs",
    docs: "https://developer.adzuna.com/",
    note: "Jangan mengasumsikan cakupan Indonesia. Pilih negara dari daftar yang didukung.",
  },
  {
    id: "arbeitnow",
    name: "Arbeitnow",
    group: "jobs",
    description:
      "Sumber lowongan publik yang sudah digunakan HOLYAI; cakupan pasar terbatas.",
    icon: "Briefcase",
    endpoint: "https://www.arbeitnow.com/api",
    auth: ["public"],
    fields: {},
    capabilities: ["jobs"],
    adapter: "jobs",
    publicAccess: true,
    docs: "https://www.arbeitnow.com/blog/job-board-api",
  },
  {
    id: "youtube",
    name: "YouTube Data API",
    group: "social",
    description: "Fondasi connector untuk data publik yang diizinkan YouTube.",
    icon: "Youtube",
    endpoint: "https://www.googleapis.com/youtube/v3",
    auth: ["api_key", "oauth2"],
    fields: { apiKey: "YouTube API Key" },
    capabilities: [],
    adapter: "foundation",
    docs: "https://developers.google.com/youtube/v3",
    note: "Pencarian sosial belum dipasang pada fitur pengguna.",
  },
  {
    id: "instagram",
    name: "Instagram",
    group: "social",
    description:
      "Connector khusus berdasarkan produk, izin, dan review aplikasi Meta.",
    icon: "Instagram",
    endpoint: "https://graph.instagram.com",
    auth: ["oauth2"],
    fields: { clientId: "Application ID", clientSecret: "Application Secret" },
    capabilities: [],
    adapter: "foundation",
    docs: "https://developers.facebook.com/docs/instagram-platform/",
  },
  {
    id: "tiktok",
    name: "TikTok",
    group: "social",
    description:
      "Connector resmi yang mengikuti scope dan akses aplikasi TikTok.",
    icon: "Music2",
    endpoint: "https://open.tiktokapis.com/v2",
    auth: ["oauth2"],
    fields: { clientId: "Client Key", clientSecret: "Client Secret" },
    capabilities: [],
    adapter: "foundation",
    docs: "https://developers.tiktok.com/",
  },
  {
    id: "facebook",
    name: "Facebook",
    group: "social",
    description: "Connector Graph API sesuai permission dan review aplikasi.",
    icon: "Facebook",
    endpoint: "https://graph.facebook.com",
    auth: ["oauth2"],
    fields: { clientId: "Application ID", clientSecret: "Application Secret" },
    capabilities: [],
    adapter: "foundation",
    docs: "https://developers.facebook.com/docs/graph-api/",
  },
  {
    id: "x",
    name: "X",
    group: "social",
    description: "Connector resmi dengan paket, scope, dan akses yang sesuai.",
    icon: "AtSign",
    endpoint: "https://api.x.com/2",
    auth: ["bearer", "oauth2"],
    fields: { token: "Bearer Token" },
    capabilities: [],
    adapter: "foundation",
    docs: "https://docs.x.com/",
  },
];
export const providerById = (id: string) =>
  providers.find((provider) => provider.id === id);
export function credentialFields(
  provider: ProviderDefinition,
  method: AuthMethod,
): Record<string, string> {
  if (method === "public") return {};
  if (provider.id === "adzuna") return provider.fields;
  if (method === "oauth2" || method === "client_credentials")
    return { clientId: "Client ID", clientSecret: "Client Secret" };
  if (method === "bearer") return { token: "Bearer Token" };
  if (method === "service_account")
    return { serviceAccount: "Service Account JSON" };
  return { apiKey: provider.fields.apiKey || "API Key" };
}
export const connectionNames: Record<string, string> = {
  not_configured: "Not Configured",
  configured: "Configured / Untested",
  connected: "Connected",
  failed: "Connection Failed",
  disabled: "Disabled",
  verification_unavailable: "Verification Unavailable",
  available: "Available / Untested",
};
