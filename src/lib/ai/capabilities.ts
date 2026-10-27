export function capabilities() {
  return {
    text: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
    image: !!process.env.OPENAI_API_KEY,
    video: !!process.env.OPENAI_API_KEY,
    search: !!(
      process.env.TAVILY_API_KEY &&
      (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)
    ),
    academic: true,
    local: true,
    storage: !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID),
    queue: !!process.env.REDIS_URL,
    canva: !!(
      process.env.CANVA_CLIENT_ID &&
      process.env.CANVA_CLIENT_SECRET &&
      process.env.TOKEN_ENCRYPTION_KEY
    ),
    email: !!process.env.RESEND_API_KEY,
    google: !!process.env.GOOGLE_CLIENT_ID,
    models: [
      ...(process.env.OPENAI_API_KEY
        ? [
            {
              id: "openai",
              name: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
            },
          ]
        : []),
      ...(process.env.ANTHROPIC_API_KEY
        ? [
            {
              id: "anthropic",
              name: process.env.ANTHROPIC_TEXT_MODEL || "claude-sonnet-4-5",
            },
          ]
        : []),
    ],
    imageRatios: ["1:1", "3:2", "2:3"],
    videoDurations: [4, 8, 12],
    videoRatios: ["16:9", "9:16"],
    imageEditing: false,
    imageToVideo: false,
    negativePrompt: false,
  };
}
