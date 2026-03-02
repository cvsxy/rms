import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/loyalty/members
 * List all loyalty members with customer info (admin only)
 */
export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const members = await prisma.loyaltyMember.findMany({
    orderBy: { joinedAt: "desc" },
    include: {
      customer: {
        select: { id: true, name: true, phone: true },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  // Aggregate stats
  const totalPointsIssued = members.reduce((sum, m) => sum + m.totalEarned, 0);
  const totalRedeemed = members.reduce((sum, m) => sum + m.totalRedeemed, 0);

  return NextResponse.json({
    data: members,
    stats: {
      totalMembers: members.length,
      totalPointsIssued,
      totalRedeemed,
    },
  });
}
