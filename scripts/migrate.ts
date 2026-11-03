import { getMigrations } from "better-auth/db/migration";
import { readFile, readdir } from "node:fs/promises";
if (process.env.MIGRATION_DATABASE_URL)
  process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;
const { getAuth } = await import("../src/lib/auth");
const { db } = await import("../src/lib/db");
const client = await db.connect();
try {
  await client.query(
    "SELECT pg_advisory_lock(hashtext('streamify-migrations'))",
  );
  const authMigrations = await getMigrations(getAuth().options);
  await authMigrations.runMigrations();
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const name of (await readdir("migrations"))
    .filter((v) => v.endsWith(".sql"))
    .sort()) {
    if (
      (
        await client.query("SELECT 1 FROM schema_migrations WHERE name=$1", [
          name,
        ])
      ).rowCount
    )
      continue;
    await client.query("BEGIN");
    try {
      await client.query(await readFile(`migrations/${name}`, "utf8"));
      await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [
        name,
      ]);
      await client.query("COMMIT");
      console.log(`Applied ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.query(
    "SELECT pg_advisory_unlock(hashtext('streamify-migrations'))",
  );
  client.release();
  await db.end();
}
