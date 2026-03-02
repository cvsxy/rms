import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const redeemSchema = z.object({
  customerId: z.string().cuid(),
  rewardId: z.string().cuid(),
  orderId: z.string().cuid(),
});

/**
 * POST /api/loyalty/redeem
 * Redeem a loyalty reward: deduct points from member, create REDEEM transaction,
 * and apply discount to order via OrderDiscount (any authenticated user)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { customerId, rewardId, orderId } = parsed.data;

  // Fetch member, reward, and order in parallel
  const [member, reward, order] = await Promise.all([
    prisma.loyaltyMember.findUnique({ where: { customerId } }),
    prisma.loyaltyReward.findUnique({ where: { id: rewardId } }),
    prisma.order.findUnique({ where: { id: orderId } }),
  ]);

  if (!member) {
    return NextResponse.json({ error: "Loyalty member not found" }, { status: 404 });
  }
  if (!reward) {
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  }
  if (!reward.active) {
    return NextResponse.json({ error: "Reward is no longer active" }, { status: 400 });
  }
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check sufficient points
  if (member.pointsBalance < reward.pointsCost) {
    return NextResponse.json(
      {
        error: "Insufficient points",
        required: reward.pointsCost,
        available: member.pointsBalance,
      },
      { status: 400 }
    );
  }

  // Execute redemption in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Deduct points from member
    const updatedMember = await tx.loyaltyMember.update({
      where: { id: member.id },
      data: {
        pointsBalance: { decrement: reward.pointsCost },
        totalRedeemed: { increment: reward.pointsCost },
      },
    });

    // Create REDEEM transaction
    const loyaltyTx = await tx.loyaltyTransaction.create({
      data: {
        memberId: member.id,
        type: "REDEEM",
        points: -reward.pointsCost,
        orderId,
        rewardId: reward.id,
        description: `Redeemed: ${reward.name}`,
      },
    });

    // Apply discount to order via OrderDiscount
    const orderDiscount = await tx.orderDiscount.create({
      data: {
        orderId,
        type: reward.type,
        value: reward.value,
        appliedById: auth.session.userId,
        note: `Loyalty reward: ${reward.name}`,
      },
    });

    return { member: updatedMember, transaction: loyaltyTx, orderDiscount };
  });

  return NextResponse.json({ data: result }, { status: 201 });
}
