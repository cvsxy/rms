import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const redeemGiftCardSchema = z.object({
  code: z.string().min(1),
  orderId: z.string().cuid(),
  amount: z.number().positive(),
});

/**
 * POST /api/gift-cards/redeem
 * Redeem a gift card: deduct from balance, create GiftCardUsage,
 * and apply as OrderDiscount with type FIXED (any authenticated user)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = redeemGiftCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { code, orderId, amount } = parsed.data;

  // Fetch gift card and order in parallel
  const [giftCard, order] = await Promise.all([
    prisma.giftCard.findUnique({ where: { code: code.toUpperCase() } }),
    prisma.order.findUnique({ where: { id: orderId } }),
  ]);

  if (!giftCard) {
    return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
  }
  if (!giftCard.active) {
    return NextResponse.json({ error: "Gift card is deactivated" }, { status: 400 });
  }
  if (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Gift card has expired" }, { status: 400 });
  }
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check sufficient balance
  const balance = Number(giftCard.balance);
  if (balance < amount) {
    return NextResponse.json(
      {
        error: "Insufficient gift card balance",
        required: amount,
        available: balance,
      },
      { status: 400 }
    );
  }

  // Execute redemption in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Deduct from gift card balance
    const updatedCard = await tx.giftCard.update({
      where: { id: giftCard.id },
      data: {
        balance: { decrement: amount },
      },
    });

    // Create usage record
    const usage = await tx.giftCardUsage.create({
      data: {
        giftCardId: giftCard.id,
        orderId,
        amount,
      },
    });

    // Apply as OrderDiscount with type FIXED
    const orderDiscount = await tx.orderDiscount.create({
      data: {
        orderId,
        type: "FIXED",
        value: amount,
        appliedById: auth.session.userId,
        note: `Gift card: ${giftCard.code}`,
      },
    });

    return { giftCard: updatedCard, usage, orderDiscount };
  });

  return NextResponse.json({ data: result }, { status: 201 });
}
