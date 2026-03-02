import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createGiftCardSchema = z.object({
  originalAmount: z.number().positive(),
  purchaserName: z.string().max(100).optional(),
  recipientName: z.string().max(100).optional(),
  recipientPhone: z.string().max(20).optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * Generate an 8-character alphanumeric gift card code
 */
function generateCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * GET /api/gift-cards
 * List all gift cards (admin only)
 */
export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const giftCards = await prisma.giftCard.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { usages: true },
      },
    },
  });

  return NextResponse.json({ data: giftCards });
}

/**
 * POST /api/gift-cards
 * Create a new gift card with auto-generated code (admin only)
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const body = await request.json();
  const parsed = createGiftCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { originalAmount, purchaserName, recipientName, recipientPhone, expiresAt } = parsed.data;

  // Generate a unique code, retry if collision
  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.giftCard.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
    attempts++;
  }
  if (attempts >= 10) {
    return NextResponse.json({ error: "Failed to generate unique code" }, { status: 500 });
  }

  const giftCard = await prisma.giftCard.create({
    data: {
      code,
      originalAmount,
      balance: originalAmount,
      purchaserName: purchaserName || null,
      recipientName: recipientName || null,
      recipientPhone: recipientPhone || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ data: giftCard }, { status: 201 });
}
