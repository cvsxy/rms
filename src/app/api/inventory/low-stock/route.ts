import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // Get all active ingredients and filter where currentStock <= lowStockThreshold
  const ingredients = await prisma.ingredient.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const lowStock = ingredients.filter(
    (i) => Number(i.currentStock) <= Number(i.lowStockThreshold)
  );

  return NextResponse.json({ data: lowStock });
}
