import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tables = await prisma.restaurantTable.findMany({
    where: { active: true },
    orderBy: { number: "asc" },
    include: {
      orders: {
        where: { status: { in: ["OPEN", "SUBMITTED", "COMPLETED"] } },
        include: { server: { select: { name: true } } },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return NextResponse.json({ data: tables });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const table = await prisma.restaurantTable.create({ data: body });
  return NextResponse.json({ data: table }, { status: 201 });
}
