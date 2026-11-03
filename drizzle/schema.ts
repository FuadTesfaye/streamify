import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  bigserial,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("viewer"),
  status: text("status").notNull().default("active"),
  twoFactorEnabled: boolean("twoFactorEnabled").notNull().default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("General"),
  published: boolean("published").notNull().default(false),
  price: integer("price").notNull().default(0),
  isPremium: boolean("is_premium").notNull().default(false),
  currency: text("currency").notNull().default("usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  position: integer("position").notNull(),
  videoId: text("video_id").notNull(),
  provider: text("provider").notNull().default("youtube"),
  visibility: text("visibility").notNull().default("free"),
  playbackPolicy: text("playback_policy").notNull().default("public"),
  published: boolean("published").notNull().default(false),
});

export const enrollments = pgTable(
  "enrollments",
  {
    userId: text("user_id").notNull(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    active: boolean("active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.courseId] }),
  })
);

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const playbackSessions = pgTable("playback_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  browserId: text("browser_id").notNull(),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const securityEvents = pgTable("security_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  kind: text("kind").notNull(),
  userId: text("user_id"),
  reference: text("reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  provider: text("provider").notNull().default("stripe"),
  transactionReference: text("transaction_reference").notNull().unique(),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
