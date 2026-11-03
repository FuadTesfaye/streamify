import { db, tx } from "../src/lib/db";
if (process.env.NODE_ENV === "production")
  throw new Error("Development fixtures are disabled in production.");
try {
  await tx(async (client) => {
    await client.query(
      "INSERT INTO courses(id,title,description,category,published) VALUES('demo-foundations','Foundations of thoughtful learning','Build a sustainable practice of learning through reflection, clear goals, and focused study.','Learning skills',false) ON CONFLICT(id) DO NOTHING",
    );
    await client.query(
      "INSERT INTO lessons(id,course_id,title,description,position,video_id,published) VALUES('demo-welcome','demo-foundations','Welcome to your learning journey','Replace the placeholder video ID with your own unlisted video before publishing.',1,'PLACEHOLDER',false) ON CONFLICT(id) DO NOTHING",
    );
  });
  console.log(
    "Created draft course and lesson. No accounts, enrollments, or working videos were seeded.",
  );
} finally {
  await db.end();
}
