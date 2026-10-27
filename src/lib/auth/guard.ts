import { db } from "@/lib/database";
import { hasPermission } from "@/lib/permissions";
import { headers } from "next/headers";
import { auth } from "./index";
import { AppError } from "@/lib/errors";
export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new AppError(401, "Masuk untuk melanjutkan.");
  return session.user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (
    !hasPermission(
      (
        await db.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        })
      )?.role || "user",
      "providers.read",
    )
  )
    throw new AppError(403, "Akses administrator diperlukan.");
  return user;
}
export function assertOrigin(request: Request) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.headers.get("origin") !==
      new URL(process.env.APP_URL || "http://localhost:3000").origin
  )
    throw new AppError(403, "Permintaan lintas situs ditolak.");
}
