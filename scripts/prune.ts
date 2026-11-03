import { pruneEvents } from "../src/lib/security";
import { db } from "../src/lib/db";
try {
  console.log(
    `Removed ${(await pruneEvents()).length} expired security events.`,
  );
} finally {
  await db.end();
}
