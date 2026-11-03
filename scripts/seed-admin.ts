import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db, tx } from "../src/lib/db";
import { hash, token } from "../src/lib/tokens";

async function seed() {
  console.log("Seeding rich admin & platform data to database...");

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
      const exists = await client.query('SELECT id FROM "user" WHERE email = $1', [s.email]);
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
    console.log("Created 4 sample students.");

    // 3. Create Courses & Lessons
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
      },
      {
        id: course2Id,
        title: "Distributed Systems & Zero-Trust Security",
        description: "Comprehensive guide to concurrency control, PostgreSQL row-level locks, token rotation, and lease heartbeat protocols.",
        category: "Systems & Security",
        published: true,
      },
      {
        id: course3Id,
        title: "Advanced TypeScript & Runtime Validation",
        description: "Type safety from database to client: building end-to-end type-safe schemas with Zod, Drizzle, and TypeScript 6.",
        category: "Programming Languages",
        published: true,
      },
      {
        id: course4Id,
        title: "Cloudflare Stream & Private Video CDN Pipelines",
        description: "Draft curriculum covering signed playback tokens, adaptive bitrate delivery, and multi-tenant video distribution.",
        category: "Cloud Infrastructure",
        published: false,
      },
    ];

    for (const c of coursesData) {
      await client.query(
        "INSERT INTO courses (id, title, description, category, published) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET title=$2, description=$3, category=$4, published=$5",
        [c.id, c.title, c.description, c.category, c.published],
      );
    }

    const lessonsData = [
      // Course 1 Lessons
      {
        id: "les-web-01",
        course_id: course1Id,
        title: "1. Next.js App Router & Server Components Architecture",
        description: "Deep dive into React 19 Server Components, streaming HTML chunks, and client-server boundaries.",
        position: 1,
        video_id: "SqcY0GlETPk",
        published: true,
      },
      {
        id: "les-web-02",
        course_id: course1Id,
        title: "2. Zero-Trust Access Control & HttpOnly Sessions",
        description: "Implementing strict server-side session guards and anti-CSRF token verification.",
        position: 2,
        video_id: "bMknfKXIFA8",
        published: true,
      },
      {
        id: "les-web-03",
        course_id: course1Id,
        title: "3. Ephemeral Video Leases & Heartbeat Synchronization",
        description: "Connecting client playback heartbeats to database lease tables with automatic revocation.",
        position: 3,
        video_id: "LDB4uaJ87e0",
        published: true,
      },
      // Course 2 Lessons
      {
        id: "les-sys-01",
        course_id: course2Id,
        title: "1. PostgreSQL Concurrency & Account Row Locking",
        description: "Preventing race conditions and simultaneous streams using SELECT FOR UPDATE.",
        position: 1,
        video_id: "jNQXAC9IVRw",
        published: true,
      },
      {
        id: "les-sys-02",
        course_id: course2Id,
        title: "2. Ephemeral Cryptographic Embed Tokens",
        description: "Creating HMAC-SHA256 time-bound tokens with copy-paste self-expiration.",
        position: 2,
        video_id: "M576WGiDBdQ",
        published: true,
      },
      // Course 3 Lessons
      {
        id: "les-ts-01",
        course_id: course3Id,
        title: "1. Mastering Advanced TypeScript Generics",
        description: "Building expressive domain models and type-safe data transformations.",
        position: 1,
        video_id: "ydkQlJhell8",
        published: true,
      },
      {
        id: "les-ts-02",
        course_id: course3Id,
        title: "2. Runtime Schema Validation with Zod & Drizzle",
        description: "Synchronizing database schemas with runtime validators and API contracts.",
        position: 2,
        video_id: "V_xro18D3bM",
        published: true,
      },
      // Course 4 Draft Lesson
      {
        id: "les-cloud-01",
        course_id: course4Id,
        title: "1. Private Video CDNs & DRM Gateways",
        description: "Draft notes comparing YouTube embeds to Cloudflare Stream and Mux signed URLs.",
        position: 1,
        video_id: "21X5lGlDOfg",
        published: false,
      },
    ];

    for (const l of lessonsData) {
      await client.query(
        "INSERT INTO lessons (id, course_id, title, description, position, video_id, published) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET title=$3, description=$4, position=$5, video_id=$6, published=$7",
        [l.id, l.course_id, l.title, l.description, l.position, l.video_id, l.published],
      );
    }
    console.log("Created 8 comprehensive lessons across 4 courses.");

    // 4. Enrollments
    const enrollments = [
      { user_id: student1Id, course_id: course1Id },
      { user_id: student1Id, course_id: course2Id },
      { user_id: student2Id, course_id: course1Id },
      { user_id: student3Id, course_id: course3Id },
    ];
    for (const e of enrollments) {
      await client.query(
        "INSERT INTO enrollments (user_id, course_id, active) VALUES ($1, $2, true) ON CONFLICT (user_id, course_id) DO NOTHING",
        [e.user_id, e.course_id],
      );
    }
    console.log("Created course enrollments.");

    // 5. Sample Invitations
    const invites = [
      { email: "david.kim@example.com", course_id: course1Id, days: 5 },
      { email: "sophia.patel@example.com", course_id: course2Id, days: 7 },
      { email: "jordan.lee@example.com", course_id: null, days: 3 },
    ];
    for (const inv of invites) {
      const inviteToken = token();
      await client.query(
        "INSERT INTO invitations (email, token_hash, course_id, expires_at) VALUES ($1, $2, $3, now() + ($4 || ' days')::interval) ON CONFLICT DO NOTHING",
        [inv.email, hash(inviteToken), inv.course_id, String(inv.days)],
      );
    }
    console.log("Created sample pending invitations.");

    // 6. Security Events Audit Trail
    const events = [
      { kind: "invitation_sent", reference: "david.kim@example.com" },
      { kind: "invitation_accepted", user_id: student1Id, reference: "Sarah Chen enrolled" },
      { kind: "browser_verified", user_id: student1Id, reference: "Sarah's Laptop" },
      { kind: "playback_granted", user_id: student1Id, reference: "les-web-01" },
      { kind: "playback_heartbeat", user_id: student1Id, reference: "Pulse renewed (30s)" },
      { kind: "rate_limit_exceeded", reference: "Suspicious rapid requests on /api/embed" },
      { kind: "embed_playback_granted", user_id: student2Id, reference: "Ephemeral token verified" },
      { kind: "account_suspended", user_id: student4Id, reference: "Access paused by Administrator" },
    ];

    for (const ev of events) {
      await client.query(
        "INSERT INTO security_events (kind, user_id, reference, created_at) VALUES ($1, $2, $3, now() - (random() * 3600 || ' seconds')::interval)",
        [ev.kind, ev.user_id || null, ev.reference || null],
      );
    }
    console.log("Created security events log history.");
  });

  console.log("Data seeding completed successfully!");
}

seed()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.end();
  });
