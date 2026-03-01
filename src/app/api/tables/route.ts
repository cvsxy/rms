import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [tables, layoutSetting] = await Promise.all([
    prisma.restaurantTable.findMany({
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
    }),
    prisma.restaurantSetting.findFirst({ where: { key: "useCustomLayout" } }),
  ]);
  return NextResponse.json({
    data: tables,
    settings: { useCustomLayout: layoutSetting?.value === "true" },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const table = await prisma.restaurantTable.create({ data: body });
  return NextResponse.json({ data: table }, { status: 201 });
}
