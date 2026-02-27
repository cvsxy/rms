import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  const { positions } = await request.json();

  if (!Array.isArray(positions)) {
    return NextResponse.json({ error: "positions must be an array" }, { status: 400 });
  }

  await prisma.$transaction(
    positions.map((p: { id: string; posX: number; posY: number }) =>
      prisma.restaurantTable.update({
        where: { id: p.id },
        data: { posX: p.posX, posY: p.posY },
      })
    )
  );

  return NextResponse.json({ data: { success: true } });
}
