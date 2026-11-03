import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../drizzle/schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.nhzjbxthxbwmgqtdjmlh:RMST1TrtUnLmOGcv@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { schema, client };
