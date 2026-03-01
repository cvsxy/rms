import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

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

  const session = await getSession();
  if (session) {
    await createAuditLog({
      action: "STOCK_ADJUSTED",
      userId: session.userId,
      details: {
        ingredientId: id,
        ingredientName: ingredient.name,
        adjustment,
        newStock: Number(ingredient.currentStock),
      },
    });
  }

  return NextResponse.json({ data: ingredient });
}
