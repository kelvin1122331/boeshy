// Optional local PostgreSQL for development/QA without Docker. Never use in production.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";
const dir = path.resolve(".local/postgres-native");
const postgres = new EmbeddedPostgres({
  databaseDir: dir,
  user: "postgres",
  password: "local-qa-password",
  port: 54328,
  persistent: true,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(path.join(dir, "PG_VERSION"))) await postgres.initialise();
await postgres.start();
console.info("Local PostgreSQL ready on 127.0.0.1:54328 (development only).");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await postgres.stop();
    process.exit(0);
  });
setInterval(() => {}, 60000);
