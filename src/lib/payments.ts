import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { db, rows, tx } from "./db";
import { audit } from "./security";
import { assert } from "./errors";

export interface PaymentRecord {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  provider: string;
  transactionReference: string;
  status: "pending" | "completed" | "failed" | "refunded";
  createdAt: string;
}

export interface EntitlementInfo {
  userId: string;
  courseId: string;
  courseTitle: string;
  isPremium: boolean;
  price: number;
  active: boolean;
  expiresAt: string | null;
  isExpired: boolean;
}

/**
 * Grants or updates course access for a user.
 * @param durationMonths Number of months until access expires. If omitted or null, access is lifetime.
 */
export async function grantEntitlement(
  userId: string,
  courseId: string,
  durationMonths?: number | null,
  client: PoolClient | typeof db = db,
): Promise<{ active: boolean; expiresAt: Date | null }> {
  let expiresAt: Date | null = null;
  if (durationMonths && durationMonths > 0) {
    expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
  }

  await client.query(
    `INSERT INTO enrollments (user_id, course_id, active, expires_at)
     VALUES ($1, $2, true, $3)
     ON CONFLICT (user_id, course_id)
     DO UPDATE SET active = true, expires_at = EXCLUDED.expires_at`,
    [userId, courseId, expiresAt],
  );

  await audit(
    "enrollment_granted",
    userId,
    JSON.stringify({ courseId, durationMonths, expiresAt }),
    client,
  );

  return { active: true, expiresAt };
}

/**
 * Revokes course access for a user.
 */
export async function revokeEntitlement(
  userId: string,
  courseId: string,
  client: PoolClient | typeof db = db,
): Promise<void> {
  await client.query(
    "UPDATE enrollments SET active = false WHERE user_id = $1 AND course_id = $2",
    [userId, courseId],
  );
  await audit("enrollment_revoked", userId, courseId, client);
}

/**
 * Records a financial transaction and automatically grants course entitlement on completion.
 */
export async function recordPayment(
  params: {
    userId: string;
    courseId: string;
    amount: number;
    currency?: string;
    provider?: string;
    transactionReference?: string;
    status?: "pending" | "completed" | "failed" | "refunded";
    durationMonths?: number;
  },
  client: PoolClient | typeof db = db,
): Promise<PaymentRecord> {
  const currency = params.currency || "usd";
  const provider = params.provider || "stripe";
  const status = params.status || "completed";
  const durationMonths = params.durationMonths ?? 12; // Default 1-year entitlement for paid courses
  const reference =
    params.transactionReference ||
    `tx_${Date.now()}_${randomBytes(6).toString("hex")}`;

  const [payment] = await rows<{
    id: string;
    user_id: string;
    course_id: string;
    amount: number;
    currency: string;
    provider: string;
    transaction_reference: string;
    status: "pending" | "completed" | "failed" | "refunded";
    created_at: Date;
  }>(
    `INSERT INTO payments (user_id, course_id, amount, currency, provider, transaction_reference, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, course_id, amount, currency, provider, transaction_reference, status, created_at`,
    [
      params.userId,
      params.courseId,
      params.amount,
      currency,
      provider,
      reference,
      status,
    ],
    client,
  );

  assert(payment, 500, "PAYMENT_CREATION_FAILED");

  if (status === "completed") {
    await grantEntitlement(
      params.userId,
      params.courseId,
      durationMonths,
      client,
    );
    await audit(
      "payment_completed",
      params.userId,
      `ref:${reference};amt:${params.amount};course:${params.courseId}`,
      client,
    );
  }

  return {
    id: payment.id,
    userId: payment.user_id,
    courseId: payment.course_id,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    transactionReference: payment.transaction_reference,
    status: payment.status,
    createdAt: payment.created_at.toISOString(),
  };
}

/**
 * Retrieves all entitlements for a user with expiry status.
 */
export async function getUserEntitlements(
  userId: string,
): Promise<EntitlementInfo[]> {
  const result = await rows<{
    user_id: string;
    course_id: string;
    title: string;
    is_premium: boolean;
    price: number;
    active: boolean;
    expires_at: Date | null;
  }>(
    `SELECT e.user_id, e.course_id, c.title, c.is_premium, c.price, e.active, e.expires_at
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.user_id = $1`,
    [userId],
  );

  const now = Date.now();
  return result.map((r) => ({
    userId: r.user_id,
    courseId: r.course_id,
    courseTitle: r.title,
    isPremium: r.is_premium,
    price: r.price,
    active: r.active,
    expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
    isExpired: Boolean(r.expires_at && new Date(r.expires_at).getTime() < now),
  }));
}

/**
 * Checks if a user has an active, unexpired entitlement for a course.
 */
export async function hasActiveEntitlement(
  userId: string,
  courseId: string,
  client: PoolClient | typeof db = db,
): Promise<boolean> {
  const [row] = await rows<{ active: boolean; expires_at: Date | null }>(
    `SELECT active, expires_at
     FROM enrollments
     WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId],
    client,
  );

  if (!row || !row.active) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return false;
  }
  return true;
}
