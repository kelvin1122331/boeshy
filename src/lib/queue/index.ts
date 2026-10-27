import { Queue } from "bullmq";
import Redis from "ioredis";
import { AppError } from "@/lib/errors";
let redis: Redis | undefined;
export function connection() {
  if (!process.env.REDIS_URL)
    throw new AppError(
      503,
      "Requires Configuration: hubungkan Redis dan jalankan worker.",
    );
  return (redis ??= new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 3000,
    enableOfflineQueue: false,
  }));
}
let queue: Queue | undefined;
export function jobsQueue() {
  return (queue ??= new Queue("holyai", { connection: connection() }));
}
export async function ensureRedis() {
  const c = connection();
  if (c.status === "wait") await c.connect();
  await c.ping();
  return c;
}
export async function rateLimit(key: string, max = 30) {
  const c = await ensureRedis();
  const value = (await c.eval(
    "local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],60) end;return n",
    1,
    `limit:${key}`,
  )) as number;
  if (value > max)
    throw new AppError(
      429,
      "Terlalu banyak permintaan. Coba lagi dalam satu menit.",
    );
}
