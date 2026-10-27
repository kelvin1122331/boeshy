import { db } from "@/lib/database";
import { ensureRedis, jobsQueue } from "@/lib/queue";
import { storage } from "@/lib/storage";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { encryptionReady } from "./secrets";
import { listProviders, initializeAdmin, setting } from "./configuration";
import { readFile } from "node:fs/promises";
export async function overview() {
  await initializeAdmin();
  const now = new Date();
  const [
    users,
    active,
    requests,
    success,
    failed,
    jobs,
    files,
    assets,
    providerList,
    cost,
  ] = await Promise.all([
    db.user.count(),
    db.session.findMany({
      where: { expiresAt: { gt: now } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    db.usageRecord.count(),
    db.usageRecord.count({ where: { status: "completed" } }),
    db.usageRecord.count({ where: { status: "failed" } }),
    db.generationJob.groupBy({ by: ["status"], _count: true }),
    db.projectFile.aggregate({ _sum: { size: true }, _count: true }),
    db.generatedAsset.count(),
    listProviders(),
    db.usageRecord.aggregate({ _sum: { estimatedCost: true } }),
  ]);
  return {
    users,
    activeUsers: active.length,
    requests,
    success,
    failed,
    jobs,
    storageBytes: files._sum.size ?? 0,
    files: files._count,
    generatedAssets: assets,
    generatedAssetBytes: null,
    estimatedCost: cost._sum.estimatedCost,
    primary: {
      search: await setting("primary.search", "tavily"),
      academic: await setting("primary.academic", "crossref"),
      jobs: await setting("primary.jobs", "arbeitnow"),
    },
    database: {
      status: "connected",
      engine: (process.env.DATABASE_URL || "").includes("supabase")
        ? "Supabase PostgreSQL"
        : "PostgreSQL",
    },
    providers: providerList.map((p) => ({
      id: p.id,
      name: p.definition.name,
      group: p.definition.group,
      status: p.status,
      enabled: p.enabled,
      configured: p.configured,
      checkedAt: p.checkedAt,
    })),
    encryptionReady: encryptionReady(),
  };
}
export async function usageReport(from: Date, to: Date) {
  const where = { createdAt: { gte: from, lte: to } };
  const [byFeature, byModel, byUser, rows] = await Promise.all([
    db.usageRecord.groupBy({
      by: ["feature", "provider", "status"],
      where,
      _count: true,
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
      _avg: { latencyMs: true },
    }),
    db.usageRecord.groupBy({
      by: ["model", "provider", "status"],
      where,
      _count: true,
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
    }),
    db.usageRecord.groupBy({
      by: ["userId", "status"],
      where,
      _count: true,
      _sum: { inputTokens: true, outputTokens: true },
    }),
    db.usageRecord.findMany({
      where,
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 10000,
    }),
  ]);
  const days: Record<
    string,
    { requests: number; completed: number; failed: number }
  > = {};
  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    days[day] ??= { requests: 0, completed: 0, failed: 0 };
    days[day].requests++;
    if (row.status === "completed") days[day].completed++;
    if (row.status === "failed") days[day].failed++;
  }
  return {
    from,
    to,
    byFeature,
    byModel,
    byUser,
    days: Object.entries(days)
      .sort()
      .map(([date, data]) => ({ date, ...data })),
    chartLimited: rows.length === 10000,
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
  };
}
export async function infrastructure(check = false) {
  const started = Date.now();
  await db.$queryRaw`SELECT 1`;
  const [tables, migrations, files, assets] = await Promise.all([
    Promise.all([
      db.user.count(),
      db.workspaceItem.count(),
      db.projectFile.count(),
      db.generationJob.count(),
      db.providerConfiguration.count(),
    ]),
    db.$queryRaw<
      {
        migration_name: string;
        finished_at: Date | null;
        rolled_back_at: Date | null;
      }[]
    >`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 10`,
    db.projectFile.aggregate({ _sum: { size: true } }),
    db.generatedAsset.count(),
  ]);
  let redis = {
    status: process.env.REDIS_URL ? "configured" : "not_configured",
    latencyMs: null as number | null,
  };
  let objectStorage = {
    status: process.env.S3_BUCKET ? "configured" : "not_configured",
    latencyMs: null as number | null,
  };
  let queueCounts: Record<string, number> | null = null;
  if (check) {
    if (process.env.REDIS_URL) {
      const time = Date.now();
      try {
        await ensureRedis();
        redis = { status: "connected", latencyMs: Date.now() - time };
        queueCounts = await jobsQueue().getJobCounts(
          "wait",
          "active",
          "completed",
          "failed",
          "delayed",
        );
      } catch {
        redis = { status: "failed", latencyMs: Date.now() - time };
      }
    }
    if (process.env.S3_BUCKET) {
      const time = Date.now();
      try {
        await storage().send(
          new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }),
        );
        objectStorage = { status: "connected", latencyMs: Date.now() - time };
      } catch {
        objectStorage = { status: "failed", latencyMs: Date.now() - time };
      }
    }
  }
  return {
    checkedAt: new Date(),
    database: {
      status: "connected",
      latencyMs: Date.now() - started,
      engine: (process.env.DATABASE_URL || "").includes("supabase")
        ? "Supabase PostgreSQL"
        : "PostgreSQL",
      authentication: "Better Auth",
      supabaseAuth:
        "Not enabled — existing account authentication is preserved",
    },
    redis,
    storage: objectStorage,
    queueCounts,
    tables: [
      "Users",
      "Workspace items",
      "Files",
      "Generation jobs",
      "Provider configurations",
    ].map((name, i) => ({ name, count: tables[i] })),
    migrations: migrations.map((m) => ({
      name: m.migration_name,
      status: m.rolled_back_at
        ? "rolled_back"
        : m.finished_at
          ? "applied"
          : "pending",
    })),
    storageUsage: {
      recordedUploadBytes: files._sum.size || 0,
      generatedAssets: assets,
      generatedAssetBytes: null,
    },
    backupStatus: "verification_unavailable",
    encryption: encryptionReady() ? "ready" : "not_configured",
  };
}
export async function deploymentStatus() {
  let build: string | null =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null;
  try {
    build ||= (await readFile(".next/BUILD_ID", "utf8")).trim();
  } catch {}
  const keys = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "APP_URL",
    "CREDENTIAL_ENCRYPTION_KEY",
    "REDIS_URL",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  ];
  return {
    environment:
      process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || "0.1.0",
    build,
    platform: process.env.VERCEL ? "Vercel" : "Local / custom host",
    services: keys.map((name) => ({ name, configured: !!process.env[name] })),
    tls:
      new URL(process.env.APP_URL || "http://localhost").protocol === "https:",
    worker:
      "Separate persistent process required; do not run BullMQ workers inside a request handler.",
    supabaseUrlConfigured: !!process.env.SUPABASE_URL,
    backupStatus:
      "Managed by database platform; not verified by this application.",
  };
}
