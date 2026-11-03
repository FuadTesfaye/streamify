import { db } from "../src/lib/drizzle";
import { users } from "../drizzle/schema";

async function main() {
  const allUsers = await db.select().from(users);
  console.log("Supabase connected successfully. Total users:", allUsers.length);
  process.exit(0);
}

main().catch((err) => {
  console.error("Supabase query failed:", err);
  process.exit(1);
});
