import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db, tx } from "../src/lib/db";
import { hash, token } from "../src/lib/tokens";

async function seed() {
  console.log("Seeding rich multi-provider courses, payments & platform data...");

  const adminId = randomUUID();
  const adminEmail = process.env.ADMIN_EMAIL || "admin@streamify.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminPassword123!";
  const hashedAdminPassword = await hashPassword(adminPassword);

  const student1Id = randomUUID();
  const student2Id = randomUUID();
  const student3Id = randomUUID();
  const student4Id = randomUUID();
  const hashedStudentPassword = await hashPassword("StudentPass123!");

  await tx(async (client) => {
    // 1. Create Administrator
    const existingAdmin = await client.query('SELECT id FROM "user" WHERE email = $1', [adminEmail]);
    if (!existingAdmin.rows.length) {
      await client.query(
        'INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role, status, "twoFactorEnabled") VALUES ($1, $2, $3, true, now(), now(), \'admin\', \'active\', false)',
        [adminId, "Gateway Administrator", adminEmail],
      );
      await client.query(
        'INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1, $2, \'credential\', $2, $3, now(), now())',
        [randomUUID(), adminId, hashedAdminPassword],
      );
      // Pre-seed a trusted browser for admin
      await client.query(
        'INSERT INTO trusted_browsers (id, user_id, token_hash, label, expires_at) VALUES ($1, $2, $3, $4, now() + interval \'30 days\')',
        [randomUUID(), adminId, hash(token()), "Admin Workstation (Chrome)"],
      );
      console.log(`Created admin account: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log(`Admin account already exists: ${adminEmail}`);
    }

    // 2. Create Students
    const students = [
      { id: student1Id, name: "Sarah Chen", email: "sarah.chen@example.com", status: "active" },
      { id: student2Id, name: "Alex Rivera", email: "alex.rivera@example.com", status: "active" },
      { id: student3Id, name: "Marcus Vance", email: "marcus.v@example.com", status: "active" },
      { id: student4Id, name: "Elena Rostova", email: "elena.r@example.com", status: "suspended" },
    ];

    for (const s of students) {
      const exists = await client.query('SELECT id, name FROM "user" WHERE email = $1', [s.email]);
      if (!exists.rows.length) {
        await client.query(
          'INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role, status, "twoFactorEnabled") VALUES ($1, $2, $3, true, now(), now(), \'student\', $4, false)',
          [s.id, s.name, s.email, s.status],
        );
        await client.query(
          'INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1, $2, \'credential\', $2, $3, now(), now())',
          [randomUUID(), s.id, hashedStudentPassword],
        );
        if (s.status === "active") {
          await client.query(
            'INSERT INTO trusted_browsers (id, user_id, token_hash, label, expires_at) VALUES ($1, $2, $3, $4, now() + interval \'30 days\')',
            [randomUUID(), s.id, hash(token()), `${s.name}'s Laptop (Safari)`],
          );
        }
      }
    }
    console.log("Validated 4 sample student accounts.");

    // Retrieve active student IDs
    const student1Row = (await client.query('SELECT id FROM "user" WHERE email = $1', ["sarah.chen@example.com"])).rows[0];
    const student2Row = (await client.query('SELECT id FROM "user" WHERE email = $1', ["alex.rivera@example.com"])).rows[0];
    const student3Row = (await client.query('SELECT id FROM "user" WHERE email = $1', ["marcus.v@example.com"])).rows[0];

    const actualStudent1Id = student1Row?.id || student1Id;
    const actualStudent2Id = student2Row?.id || student2Id;
    const actualStudent3Id = student3Row?.id || student3Id;

    // 3. Create Multi-Provider Courses & Pricing
    const course1Id = "course-web-dev";
    const course2Id = "course-systems-arch";
    const course3Id = "course-adv-ts";
    const course4Id = "course-cloud-cdn";

    const coursesData = [
      {
        id: course1Id,
        title: "Full-Stack Web Development with Next.js 16",
        description: "Modern web architecture covering Server Components, streaming SSR, zero-trust state boundaries, and API middleware design.",
        category: "Web Development",
        published: true,
        price: 0,
        is_premium: false,
      },
      {
        id: course2Id,
        title: "Distributed Systems & Zero-Trust Video Security",
        description: "Comprehensive guide to concurrency control, PostgreSQL row-level locks, Mux hardware DRM, and lease heartbeat protocols.",
        category: "Systems & Security",
        published: true,
        price: 4900, // $49.00
        is_premium: true,
      },
      {
        id: course3Id,
        title: "Advanced TypeScript & Runtime Validation",
        description: "Type safety from database to client: building end-to-end type-safe schemas with Zod, Drizzle, and TypeScript 6.",
        category: "Programming Languages",
        published: true,
        price: 0,
        is_premium: false,
      },
      {
        id: course4Id,
        title: "Cloudflare Stream & Private Video CDN Pipelines",
        description: "Production video distribution with signed playback tokens, DRM authorization, and multi-tenant video gateways.",
        category: "Cloud Infrastructure",
        published: true,
        price: 7900, // $79.00
        is_premium: true,
      },
    ];

    for (const c of coursesData) {
      await client.query(
        `INSERT INTO courses (id, title, description, category, published, price, is_premium, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'usd')
         ON CONFLICT (id) DO UPDATE SET
           title=$2, description=$3, category=$4, published=$5, price=$6, is_premium=$7, currency='usd'`,
        [c.id, c.title, c.description, c.category, c.published, c.price, c.is_premium],
      );
    }
    console.log("Updated 4 multi-provider courses with pricing.");

    // 4. Create Lessons with Multi-Provider Support
    const lessonsData = [
      // Course 1 Lessons (YouTube Free)
      {
        id: "les-web-01",
        course_id: course1Id,
        title: "1. Next.js App Router & Server Components Architecture",
        description: "Deep dive into React 19 Server Components, streaming HTML chunks, and client-server boundaries.",
        position: 1,
        video_id: "SqcY0GlETPk",
        published: true,
        provider: "youtube",
        visibility: "free",
        playback_policy: "public",
      },
      {
        id: "les-web-02",
        course_id: course1Id,
        title: "2. Zero-Trust Access Control & HttpOnly Sessions",
        description: "Implementing strict server-side session guards and anti-CSRF token verification.",
        position: 2,
        video_id: "bMknfKXIFA8",
        published: true,
        provider: "youtube",
        visibility: "free",
        playback_policy: "public",
      },
      {
        id: "les-web-03",
        course_id: course1Id,
        title: "3. Ephemeral Video Leases & Heartbeat Synchronization",
        description: "Connecting client playback heartbeats to database lease tables with automatic revocation.",
        position: 3,
        video_id: "LDB4uaJ87e0",
        published: true,
        provider: "youtube",
        visibility: "free",
        playback_policy: "public",
      },
      // Course 2 Lessons (Mux DRM Signed - Paid)
      {
        id: "les-sys-01",
        course_id: course2Id,
        title: "1. PostgreSQL Concurrency & Account Row Locking",
        description: "Preventing simultaneous streams using transactional account locks and expiring leases.",
        position: 1,
        video_id: "00DSv4W00gKgq00",
        published: true,
        provider: "mux",
        visibility: "paid",
        playback_policy: "drm",
      },
      {
        id: "les-sys-02",
        course_id: course2Id,
        title: "2. Mux Hardware DRM & Ephemeral Cryptographic Embeds",
        description: "Creating HMAC-SHA256 time-bound tokens with hardware-enforced DRM and copy-paste self-expiration.",
        position: 2,
        video_id: "01aBcDeFgHiJkLm",
        published: true,
        provider: "mux",
        visibility: "paid",
        playback_policy: "drm",
      },
      // Course 3 Lessons (YouTube Free)
      {
        id: "les-ts-01",
        course_id: course3Id,
        title: "1. Mastering Advanced TypeScript Generics",
        description: "Building expressive domain models and type-safe data transformations.",
        position: 1,
        video_id: "ydkQlJhell8",
        published: true,
        provider: "youtube",
        visibility: "free",
        playback_policy: "public",
      },
      {
        id: "les-ts-02",
        course_id: course3Id,
        title: "2. Runtime Schema Validation with Zod & Drizzle",
        description: "Synchronizing database schemas with runtime validators and API contracts.",
        position: 2,
        video_id: "V_xro18D3bM",
        published: true,
        provider: "youtube",
        visibility: "free",
        playback_policy: "public",
      },
      // Course 4 Lessons (Cloudflare Stream Signed - Paid)
      {
        id: "les-cloud-01",
        course_id: course4Id,
        title: "1. Cloudflare Stream Token-Signed Manifests",
        description: "Signed playback URLs, token expiry windows, and adaptive bitrate HLS delivery.",
        position: 1,
        video_id: "ea95132c15732412d22c1476fa83f27a",
        published: true,
        provider: "cloudflare",
        visibility: "paid",
        playback_policy: "signed",
      },
    ];

    for (const l of lessonsData) {
      await client.query(
        `INSERT INTO lessons (id, course_id, title, description, position, video_id, published, provider, visibility, playback_policy)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           title=$3, description=$4, position=$5, video_id=$6, published=$7, provider=$8, visibility=$9, playback_policy=$10`,
        [l.id, l.course_id, l.title, l.description, l.position, l.video_id, l.published, l.provider, l.visibility, l.playback_policy],
      );
    }
    console.log("Seeded 8 lessons with YouTube, Mux DRM, and Cloudflare Stream providers.");

    // 5. Enrollments with Expiry Dates
    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const sixMonthsLater = new Date(now);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const enrollments = [
      { user_id: actualStudent1Id, course_id: course1Id, expires_at: null }, // Lifetime free
      { user_id: actualStudent1Id, course_id: course2Id, expires_at: oneYearLater }, // 12-month paid entitlement
      { user_id: actualStudent2Id, course_id: course1Id, expires_at: null }, // Lifetime free
      { user_id: actualStudent2Id, course_id: course4Id, expires_at: sixMonthsLater }, // 6-month Cloudflare paid access
      { user_id: actualStudent3Id, course_id: course3Id, expires_at: null }, // Lifetime free
    ];

    for (const e of enrollments) {
      await client.query(
        `INSERT INTO enrollments (user_id, course_id, active, expires_at)
         VALUES ($1, $2, true, $3)
         ON CONFLICT (user_id, course_id)
         DO UPDATE SET active = true, expires_at = EXCLUDED.expires_at`,
        [e.user_id, e.course_id, e.expires_at],
      );
    }
    console.log("Updated student enrollments with duration expirations.");

    // 6. Payments and Financial Audit Ledger
    const paymentsData = [
      {
        id: randomUUID(),
        user_id: actualStudent1Id,
        course_id: course2Id,
        amount: 4900,
        currency: "usd",
        provider: "stripe",
        transaction_reference: "tx_stripe_prod_987212",
        status: "completed",
      },
      {
        id: randomUUID(),
        user_id: actualStudent2Id,
        course_id: course4Id,
        amount: 7900,
        currency: "usd",
        provider: "stripe",
        transaction_reference: "tx_stripe_prod_442199",
        status: "completed",
      },
      {
        id: randomUUID(),
        user_id: actualStudent3Id,
        course_id: course2Id,
        amount: 4900,
        currency: "usd",
        provider: "bank_transfer",
        transaction_reference: "tx_bank_inv_20261103",
        status: "completed",
      },
    ];

    for (const p of paymentsData) {
      await client.query(
        `INSERT INTO payments (id, user_id, course_id, amount, currency, provider, transaction_reference, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (transaction_reference) DO NOTHING`,
        [p.id, p.user_id, p.course_id, p.amount, p.currency, p.provider, p.transaction_reference, p.status],
      );
    }
    console.log("Recorded completed payments in financial ledger.");

    // 7. Security Events Audit Trail
    const events = [
      { kind: "payment_completed", user_id: actualStudent1Id, reference: "ref:tx_stripe_prod_987212;amt:4900;course:course-systems-arch" },
      { kind: "enrollment_granted", user_id: actualStudent1Id, reference: "12-month access granted to Distributed Systems" },
      { kind: "playback_granted", user_id: actualStudent1Id, reference: "les-sys-01 (Mux DRM Signed)" },
      { kind: "playback_heartbeat", user_id: actualStudent1Id, reference: "Pulse renewed (30s lease)" },
      { kind: "embed_playback_granted", user_id: actualStudent2Id, reference: "Ephemeral token verified" },
    ];

    for (const ev of events) {
      await client.query(
        "INSERT INTO security_events (kind, user_id, reference, created_at) VALUES ($1, $2, $3, now() - (random() * 1800 || ' seconds')::interval)",
        [ev.kind, ev.user_id || null, ev.reference || null],
      );
    }
  });

  console.log("Multi-provider data seeding completed successfully!");
}

seed()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.end();
  });
