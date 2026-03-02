import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/gift-cards/lookup?code=XXXXXXXX
 * Look up a gift card by code and return card with balance (any authenticated user)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Code parameter is required" }, { status: 400 });
  }

  const giftCard = await prisma.giftCard.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      id: true,
      code: true,
      originalAmount: true,
      balance: true,
      recipientName: true,
      expiresAt: true,
      active: true,
      createdAt: true,
    },
  });

  if (!giftCard) {
    return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
  }

  if (!giftCard.active) {
    return NextResponse.json({ error: "Gift card is deactivated" }, { status: 400 });
  }

  if (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Gift card has expired" }, { status: 400 });
  }

  return NextResponse.json({ data: giftCard });
}
