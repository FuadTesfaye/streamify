import { NextResponse } from "next/server";
import { recordPayment } from "@/lib/payments";
import { rows, tx } from "@/lib/db";
import { audit } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as {
      event?: string;
      provider?: string;
      data?: {
        userId?: string;
        userEmail?: string;
        courseId?: string;
        amount?: number;
        currency?: string;
        transactionReference?: string;
        durationMonths?: number;
      };
    };

    if (!payload.data || !payload.data.courseId) {
      return NextResponse.json(
        { error: "INVALID_WEBHOOK", message: "Missing payload data." },
        { status: 400 },
      );
    }

    const {
      userId,
      userEmail,
      courseId,
      amount = 0,
      currency = "usd",
      transactionReference,
      durationMonths = 12,
    } = payload.data;

    return await tx(async (client) => {
      let resolvedUserId = userId;

      // If webhook passes email instead of userId, resolve it from the user table
      if (!resolvedUserId && userEmail) {
        const [user] = await rows<{ id: string }>(
          'SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)',
          [userEmail],
          client,
        );
        if (user) {
          resolvedUserId = user.id;
        }
      }

      if (!resolvedUserId) {
        return NextResponse.json(
          { error: "USER_NOT_FOUND", message: "Could not resolve user." },
          { status: 404 },
        );
      }

      const payment = await recordPayment(
        {
          userId: resolvedUserId,
          courseId,
          amount,
          currency,
          provider: payload.provider || "webhook",
          transactionReference,
          status: "completed",
          durationMonths,
        },
        client,
      );

      await audit(
        "webhook_payment_processed",
        resolvedUserId,
        `ref:${payment.transactionReference};course:${courseId}`,
        client,
      );

      return NextResponse.json({
        received: true,
        paymentId: payment.id,
        reference: payment.transactionReference,
      });
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json(
      { error: "WEBHOOK_ERROR", message },
      { status: 500 },
    );
  }
}
