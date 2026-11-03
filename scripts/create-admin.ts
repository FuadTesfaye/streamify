import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db, tx } from "../src/lib/db";
const email = z
  .email()
  .transform((v) => v.toLowerCase())
  .parse(process.env.ADMIN_EMAIL);
const password = z.string().min(12).max(128).parse(process.env.ADMIN_PASSWORD);
const id = randomUUID(),
  hashed = await hashPassword(password);
try {
  await tx(async (client) => {
    await client.query(
      'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt",role,status,"twoFactorEnabled") VALUES($1,$2,$3,true,now(),now(),\'admin\',\'active\',false)',
      [id, process.env.ADMIN_NAME ?? "Administrator", email],
    );
    await client.query(
      'INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,\'credential\',$2,$3,now(),now())',
      [randomUUID(), id, hashed],
    );
  });
  console.log(
    "Administrator created. Sign in, configure MFA, and verify this browser before opening administration.",
  );
} finally {
  await db.end();
}
