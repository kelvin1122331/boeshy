export function textFromData(data: Record<string, unknown>) {
  return Object.entries(data)
    .map(([key, value]) =>
      typeof value === "string"
        ? value
        : Array.isArray(value)
          ? value
              .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
              .join("\n")
          : key === "title"
            ? String(value)
            : "",
    )
    .filter(Boolean)
    .join("\n\n");
}
