import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone") || "";

  if (!phone || phone.length < 4) {
    return NextResponse.json({ data: [] });
  }

  const customers = await prisma.customer.findMany({
    where: {
      active: true,
      OR: [
        { phone: { contains: phone } },
        { name: { contains: phone, mode: "insensitive" } },
      ],
    },
    take: 10,
    orderBy: { lastVisit: { sort: "desc", nulls: "last" } },
    include: {
      loyaltyMember: { select: { pointsBalance: true, tier: true } },
    },
  });

  return NextResponse.json({ data: customers });
}
