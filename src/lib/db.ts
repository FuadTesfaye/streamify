import { Pool, type PoolClient, type QueryResultRow } from "pg";
const globalDb = globalThis as unknown as { streamifyPool?: Pool };
export const db =
  globalDb.streamifyPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
if (process.env.NODE_ENV !== "production") globalDb.streamifyPool = db;
export async function rows<T extends QueryResultRow>(
  sql: string,
  values: unknown[] = [],
  client: Pool | PoolClient = db,
): Promise<T[]> {
  return (await client.query<T>(sql, values)).rows;
}
export async function tx<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
