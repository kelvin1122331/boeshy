import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function publicError(error: unknown): {
  status: number;
  message: string;
} {
  if (error instanceof AppError)
    return { status: error.status, message: error.message };
  if (error instanceof ZodError)
    return {
      status: 400,
      message: error.issues
        .map((i) => i.message)
        .slice(0, 3)
        .join(". "),
    };
  return {
    status: 503,
    message:
      "Layanan belum dapat menyelesaikan permintaan. Periksa konfigurasi atau coba lagi.",
  };
}
export function errorResponse(error: unknown) {
  const e = publicError(error);
  return Response.json({ error: e.message }, { status: e.status });
}
