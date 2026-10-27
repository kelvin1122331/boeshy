import { z } from "zod";
import { db } from "@/lib/database";
import { AppError, errorResponse } from "@/lib/errors";
import { assertOrigin } from "@/lib/auth/guard";
import { readJSON } from "@/lib/http";
import {
  roles,
  rolePermissions,
  permissionGroups,
  type Permission,
} from "@/lib/permissions";
import { adminIdentity, auditAdmin } from "./access";
import {
  initializeAdmin,
  listProviders,
  saveProvider,
  setProviderEnabled,
  deleteCredential,
  saveModel,
  saveFeature,
  writeSetting,
  setting,
} from "./configuration";
import { featureStates } from "./router";
import { testProvider } from "./provider-tests";
import {
  overview,
  usageReport,
  infrastructure,
  deploymentStatus,
} from "./monitoring";
import { setupMfa, verifyMfa } from "./mfa";
import { jobsQueue, ensureRedis } from "@/lib/queue";
function requiredPermission(resource: string, write: boolean): Permission {
  return resource === "providers"
    ? write
      ? "providers.write"
      : "providers.read"
    : resource === "models"
      ? write
        ? "models.write"
        : "providers.read"
      : resource === "features"
        ? write
          ? "features.write"
          : "providers.read"
        : resource === "users"
          ? write
            ? "users.write"
            : "users.read"
          : resource === "roles"
            ? write
              ? "roles.write"
              : "users.read"
            : resource === "settings"
              ? write
                ? "settings.write"
                : "admin.read"
              : resource === "security"
                ? "admin.read"
                : resource === "jobs" && write
                  ? "features.write"
                  : "monitoring.read";
}
async function limitAdmin(userId: string, resource: string, max = 60) {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const action = `admin.request.${resource}`;
    const count = await tx.auditLog.count({
      where: {
        userId,
        action,
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });
    if (count >= max)
      throw new AppError(
        429,
        "Terlalu banyak perubahan. Coba kembali sebentar lagi.",
      );
    await tx.auditLog.create({ data: { userId, action } });
  });
}
const limitsSchema = z
  .object({
    monthlyLimit: z.number().int().min(0).max(1000000),
    rateLimit: z.number().int().min(1).max(1000),
    monthlyBudget: z.number().positive().max(1000000).nullable(),
    maxConcurrentJobs: z.number().int().min(1).max(20),
  })
  .strict();
export async function adminAPI(request: Request, path: string[]) {
  try {
    assertOrigin(request);
    const [resource, id, action] = path;
    const write = request.method !== "GET";
    const permission = requiredPermission(resource, write);
    const bypass =
      resource === "security" && ["mfa-status", "mfa-verify"].includes(id);
    const { user, session } = await adminIdentity(permission, bypass);
    await initializeAdmin();
    if (write)
      await limitAdmin(
        user.id,
        resource === "security" ? "security" : "mutation",
        resource === "security" ? 5 : 60,
      );
    const body =
      write && request.method !== "DELETE"
        ? await readJSON(request, 60000)
        : {};
    let value: unknown;
    if (resource === "overview" && !write) value = await overview();
    else if (resource === "providers") {
      if (!write) value = await listProviders();
      else if (id && action === "test") value = await testProvider(user.id, id);
      else if (id && action === "enable")
        value = await setProviderEnabled(user.id, id, true);
      else if (id && action === "disable")
        value = await setProviderEnabled(user.id, id, false);
      else if (
        id &&
        (action === "delete-credentials" || request.method === "DELETE")
      )
        value = await deleteCredential(user.id, id);
      else if (id)
        value = await saveProvider(user.id, id, body, action === "rotate");
    } else if (resource === "models") {
      if (!write)
        value = await db.aIModel.findMany({
          orderBy: [{ providerId: "asc" }, { name: "asc" }],
        });
      else if (request.method === "DELETE" && id) {
        const used = await db.featureConfiguration.count({
          where: { OR: [{ primaryModelId: id }, { secondaryModelId: id }] },
        });
        if (used)
          throw new AppError(
            409,
            "Lepaskan model dari routing fitur sebelum menghapusnya.",
          );
        await db.aIModel.delete({ where: { id } });
        await auditAdmin(user.id, "model.deleted", id);
        value = { ok: true };
      } else value = await saveModel(user.id, body);
    } else if (resource === "features") {
      value =
        write && id
          ? await saveFeature(user.id, id, body)
          : await featureStates();
    } else if (resource === "usage" && !write) {
      const url = new URL(request.url);
      const to = url.searchParams.get("to")
        ? new Date(url.searchParams.get("to")!)
        : new Date();
      const from = url.searchParams.get("from")
        ? new Date(url.searchParams.get("from")!)
        : new Date(Date.now() - 7 * 86400000);
      if (
        !Number.isFinite(from.getTime()) ||
        !Number.isFinite(to.getTime()) ||
        from > to ||
        to.getTime() - from.getTime() > 366 * 86400000
      )
        throw new AppError(
          400,
          "Rentang tanggal belum valid (maksimal 366 hari).",
        );
      value = await usageReport(from, to);
    } else if (resource === "users") {
      if (!write) {
        const url = new URL(request.url);
        const query = (url.searchParams.get("q") || "").slice(0, 100);
        const users = await db.user.findMany({
          where: query
            ? {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { email: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            sessions: {
              where: { expiresAt: { gt: new Date() } },
              select: { id: true, createdAt: true, expiresAt: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });
        const quotas = await db.userQuota.findMany({
          where: { userId: { in: users.map((user) => user.id) } },
        });
        const limits = await setting("limits", { monthlyLimit: 200 });
        value = users.map((user) => ({
          ...user,
          monthlyLimit:
            quotas.find((quota) => quota.userId === user.id)?.monthlyLimit ??
            limits.monthlyLimit,
        }));
      } else if (id && action === "revoke-sessions") {
        const target = await db.user.findUnique({ where: { id } });
        if (!target) throw new AppError(404, "Pengguna tidak ditemukan.");
        if (
          user.role !== "super_admin" &&
          ["admin", "super_admin"].includes(target.role) &&
          target.id !== user.id
        )
          throw new AppError(403, "Akun ini hanya dapat dikelola Super Admin.");
        await db.$transaction([
          db.session.deleteMany({ where: { userId: id } }),
          db.adminMfaGrant.deleteMany({ where: { userId: id } }),
        ]);
        await auditAdmin(user.id, "sessions.revoked", id);
        value = { ok: true };
      } else if (id && action === "quota") {
        const input = z
          .object({ monthlyLimit: z.number().int().min(0).max(1000000) })
          .strict()
          .parse(body);
        if (!(await db.user.findUnique({ where: { id } })))
          throw new AppError(404, "Pengguna tidak ditemukan.");
        await db.userQuota.upsert({
          where: { userId: id },
          create: { userId: id, ...input },
          update: input,
        });
        await auditAdmin(user.id, "quota.saved", id);
        value = { ok: true };
      }
    } else if (resource === "roles") {
      if (!write)
        value = {
          roles,
          permissions: permissionGroups,
          matrix: rolePermissions,
        };
      else {
        const input = z
          .object({ userId: z.string(), role: z.enum(roles) })
          .strict()
          .parse(body);
        if (input.userId === user.id)
          throw new AppError(
            400,
            "Role akun sendiri tidak diubah dari sesi aktif.",
          );
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "User" WHERE role='super_admin' FOR UPDATE`;
          const target = await tx.user.findUnique({
            where: { id: input.userId },
          });
          if (!target) throw new AppError(404, "Pengguna tidak ditemukan.");
          if (
            target.role === "super_admin" &&
            input.role !== "super_admin" &&
            (await tx.user.count({ where: { role: "super_admin" } })) <= 1
          )
            throw new AppError(
              409,
              "Super Admin terakhir tidak dapat diturunkan.",
            );
          await tx.user.update({
            where: { id: input.userId },
            data: { role: input.role },
          });
          await tx.session.deleteMany({ where: { userId: input.userId } });
          await tx.adminMfaGrant.deleteMany({
            where: { userId: input.userId },
          });
          await tx.auditLog.create({
            data: {
              userId: user.id,
              action: "admin.role.changed",
              resourceId: input.userId,
              metadata: { role: input.role },
            },
          });
        });
        value = { ok: true };
      }
    } else if (resource === "jobs") {
      if (!write) {
        const status = new URL(request.url).searchParams.get("status");
        value = await db.generationJob.findMany({
          where: status
            ? {
                status: z
                  .enum([
                    "queued",
                    "processing",
                    "completed",
                    "failed",
                    "cancelled",
                  ])
                  .parse(status),
              }
            : {},
          select: {
            id: true,
            user: { select: { name: true } },
            kind: true,
            status: true,
            stage: true,
            providerId: true,
            createdAt: true,
            updatedAt: true,
          },
          take: 100,
          orderBy: { createdAt: "desc" },
        });
      } else if (id && action === "retry") {
        const job = await db.generationJob.findUnique({ where: { id } });
        if (!job || job.status !== "failed" || job.providerId)
          throw new AppError(
            409,
            "Pekerjaan ini tidak aman untuk diulang otomatis.",
          );
        await ensureRedis();
        const queue = jobsQueue();
        const previous = await queue.getJob(id);
        if (previous) {
          if ((await previous.getState()) !== "failed")
            throw new AppError(409, "Antrean masih menyimpan proses aktif.");
          await previous.remove();
        }
        await db.generationJob.update({
          where: { id },
          data: { status: "queued", stage: "queued", error: null },
        });
        try {
          await queue.add(
            "generate",
            { id },
            { jobId: id, removeOnComplete: 100, removeOnFail: 100 },
          );
        } catch {
          await db.generationJob.update({
            where: { id },
            data: {
              status: "failed",
              stage: "failed",
              error: "Antrean belum tersedia.",
            },
          });
          throw new AppError(503, "Antrean belum tersedia.");
        }
        await auditAdmin(user.id, "job.retried", id);
        value = { ok: true };
      }
    } else if (["health", "database"].includes(resource)) {
      value = await infrastructure(write && action !== "" && id === "check");
      if (write) await auditAdmin(user.id, "health.checked");
    } else if (resource === "deployment" && !write)
      value = await deploymentStatus();
    else if (resource === "errors" && !write) {
      const jobs = await db.generationJob.findMany({
        where: { status: "failed" },
        select: { id: true, kind: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      const failures = await db.providerConfiguration.findMany({
        where: { connectionStatus: "failed" },
        select: {
          id: true,
          errorCode: true,
          safeMessage: true,
          checkedAt: true,
        },
      });
      value = {
        jobs: jobs.map((job) => ({
          ...job,
          code: "GENERATION_FAILED",
          message:
            "Proses berhenti. Tinjau status provider dan konfigurasi fitur.",
        })),
        providers: failures,
      };
    } else if (resource === "activity" && !write)
      value = await db.auditLog.findMany({
        select: {
          id: true,
          action: true,
          resourceId: true,
          createdAt: true,
          user: { select: { name: true } },
          metadata: true,
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      });
    else if (resource === "settings") {
      if (!write)
        value = {
          general: await setting("general", {
            name: "HOLYAI",
            supportEmail: "",
            timezone: "Asia/Jakarta",
          }),
          limits: await setting("limits", {
            monthlyLimit: 200,
            rateLimit: 30,
            monthlyBudget: null,
            maxConcurrentJobs: 3,
          }),
          notifications: await setting("notifications", {
            enabled: true,
            thresholdPercent: 80,
          }),
          primary: {
            search: await setting("primary.search", "tavily"),
            academic: await setting("primary.academic", "crossref"),
            jobs: await setting("primary.jobs", "arbeitnow"),
          },
        };
      else {
        const input = z
          .object({
            key: z.enum([
              "general",
              "limits",
              "notifications",
              "primary.search",
              "primary.academic",
              "primary.jobs",
            ]),
            value: z.unknown(),
          })
          .strict()
          .parse(body);
        let parsed;
        if (input.key === "limits") parsed = limitsSchema.parse(input.value);
        else if (input.key === "notifications")
          parsed = z
            .object({
              enabled: z.boolean(),
              thresholdPercent: z.number().int().min(1).max(100),
            })
            .strict()
            .parse(input.value);
        else if (input.key === "general")
          parsed = z
            .object({
              name: z.string().trim().min(1).max(50),
              supportEmail: z.email().or(z.literal("")),
              timezone: z
                .string()
                .max(60)
                .refine((value) => {
                  try {
                    new Intl.DateTimeFormat("id", { timeZone: value });
                    return true;
                  } catch {
                    return false;
                  }
                }, "Zona waktu tidak valid."),
            })
            .strict()
            .parse(input.value);
        else {
          parsed = z.string().max(60).parse(input.value);
          const { providerById } = await import("@/config/providers");
          if (providerById(parsed)?.group !== input.key.split(".")[1])
            throw new AppError(400, "Penyedia tidak sesuai jenis layanan.");
        }
        value = await writeSetting(user.id, input.key, parsed);
      }
    } else if (resource === "security") {
      if (id === "mfa-status" && !write) {
        const mfa = await db.adminMfa.findUnique({
          where: { userId: user.id },
          select: { enabled: true },
        });
        const grant = await db.adminMfaGrant.findUnique({
          where: { sessionId: session.id },
        });
        value = {
          enabled: !!mfa?.enabled,
          verified:
            !!grant && grant.userId === user.id && grant.expiresAt > new Date(),
        };
      } else if (id === "mfa-setup" && write)
        value = await setupMfa(user.id, user.email);
      else if (id === "mfa-verify" && write)
        value = await verifyMfa(
          user.id,
          session.id,
          z.object({ code: z.string().trim().min(6).max(30) }).parse(body).code,
        );
      else if (id === "mfa-disable" && write) {
        await db.$transaction([
          db.adminMfa.deleteMany({ where: { userId: user.id } }),
          db.adminMfaGrant.deleteMany({ where: { userId: user.id } }),
        ]);
        await auditAdmin(user.id, "mfa.disabled");
        value = { ok: true };
      } else if (!write)
        value = {
          role: user.role,
          sessionExpiresAt: session.expiresAt,
          secureSessionCookies: process.env.NODE_ENV === "production",
          csrf: "Exact origin validation on every mutation",
          masterKeyStorage: "Server environment only",
          mfaSupported: true,
        };
    }
    if (value === undefined)
      throw new AppError(404, "Rute admin tidak ditemukan.");
    return Response.json(value, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch (error) {
    const response = errorResponse(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
