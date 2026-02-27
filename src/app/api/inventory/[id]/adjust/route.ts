import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { adjustment } = await request.json();

  if (typeof adjustment !== "number" || adjustment === 0) {
    return NextResponse.json(
      { error: "Adjustment must be a non-zero number" },
      { status: 400 }
    );
  }

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: { currentStock: { increment: adjustment } },
  });

  return NextResponse.json({ data: ingredient });
}
