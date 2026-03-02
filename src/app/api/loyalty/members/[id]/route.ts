import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/loyalty/members/[id]
 * Get a loyalty member by customerId, including transactions (any authenticated user)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: customerId } = await params;

  const member = await prisma.loyaltyMember.findUnique({
    where: { customerId },
    include: {
      program: {
        select: { id: true, name: true, nameEs: true, pointsPerPeso: true },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          reward: {
            select: { id: true, name: true, nameEs: true, pointsCost: true },
          },
        },
      },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Loyalty member not found" }, { status: 404 });
  }

  return NextResponse.json({ data: member });
}
