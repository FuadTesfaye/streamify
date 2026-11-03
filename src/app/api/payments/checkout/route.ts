import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/authorization";
import { rows, tx } from "@/lib/db";
import { sameOrigin } from "@/lib/security";
import { grantEntitlement, recordPayment } from "@/lib/payments";

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const viewer = await requireViewer();
    const body = (await req.json()) as {
      courseId?: string;
      durationMonths?: number;
    };

    if (!body.courseId || typeof body.courseId !== "string") {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "courseId is required." },
        { status: 400 },
      );
    }

    return await tx(async (client) => {
      const [course] = await rows<{
        id: string;
        title: string;
        price: number;
        is_premium: boolean;
        currency: string;
        published: boolean;
      }>(
        "SELECT id, title, price, is_premium, currency, published FROM courses WHERE id = $1",
        [body.courseId],
        client,
      );

      if (!course || !course.published) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Course not found or unpublished." },
          { status: 404 },
        );
      }

      // If course is free ($0 or not marked premium)
      if (course.price <= 0 || !course.is_premium) {
        const entitlement = await grantEntitlement(
          viewer.id,
          course.id,
          null,
          client,
        );
        return NextResponse.json({
          success: true,
          courseId: course.id,
          title: course.title,
          isPremium: false,
          amountPaid: 0,
          entitlement: {
            active: entitlement.active,
            expiresAt: entitlement.expiresAt,
            type: "lifetime_free",
          },
        });
      }

      // Premium course checkout with automated 12-month entitlement
      const durationMonths = body.durationMonths ?? 12;
      const payment = await recordPayment(
        {
          userId: viewer.id,
          courseId: course.id,
          amount: course.price,
          currency: course.currency || "usd",
          provider: "mock_stripe",
          status: "completed",
          durationMonths,
        },
        client,
      );

      return NextResponse.json({
        success: true,
        courseId: course.id,
        title: course.title,
        isPremium: true,
        amountPaid: course.price,
        currency: course.currency,
        payment,
      });
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Checkout failed.";
    return NextResponse.json(
      { error: "CHECKOUT_FAILED", message },
      { status: 400 },
    );
  }
}
