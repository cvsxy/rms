import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

const updateGiftCardSchema = z.object({
  active: z.boolean().optional(),
  balance: z.number().min(0).optional(),
  recipientName: z.string().max(100).optional(),
  recipientPhone: z.string().max(20).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

/**
 * GET /api/gift-cards/[id]
 * Get gift card detail with usage history (admin only)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await params;

  const giftCard = await prisma.giftCard.findUnique({
    where: { id },
    include: {
      usages: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!giftCard) {
    return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
  }

  return NextResponse.json({ data: giftCard });
}

/**
 * PUT /api/gift-cards/[id]
 * Update a gift card: deactivate, adjust balance, etc. (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await params;

  const body = await request.json();
  const parsed = updateGiftCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.giftCard.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
  }

  const data = parsed.data;

  const updated = await prisma.giftCard.update({
    where: { id },
    data: {
      ...(data.active !== undefined && { active: data.active }),
      ...(data.balance !== undefined && { balance: data.balance }),
      ...(data.recipientName !== undefined && { recipientName: data.recipientName || null }),
      ...(data.recipientPhone !== undefined && { recipientPhone: data.recipientPhone || null }),
      ...(data.expiresAt !== undefined && {
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      }),
    },
  });

  return NextResponse.json({ data: updated });
}
