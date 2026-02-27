import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const destination = searchParams.get("destination");

  const where: Record<string, unknown> = { active: true };
  if (categoryId) where.categoryId = categoryId;
  if (destination) where.destination = destination;

  const items = await prisma.menuItem.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: {
      category: true,
      modifiers: { where: { active: true } },
    },
  });
  return NextResponse.json({ data: items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { modifiers, ingredients, ...itemData } = body;
  const item = await prisma.menuItem.create({
    data: {
      ...itemData,
      modifiers: modifiers ? { create: modifiers } : undefined,
      ingredients: ingredients?.length
        ? {
            create: ingredients.map(
              (i: { ingredientId: string; quantity: number }) => ({
                ingredientId: i.ingredientId,
                quantity: i.quantity,
              })
            ),
          }
        : undefined,
    },
    include: {
      modifiers: true,
      ingredients: { include: { ingredient: true } },
    },
  });
  return NextResponse.json({ data: item }, { status: 201 });
}
