import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const ingredients = await prisma.ingredient.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      menuItems: {
        include: {
          menuItem: { select: { id: true, name: true, nameEs: true } },
        },
      },
    },
  });
  return NextResponse.json({ data: ingredients });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ingredient = await prisma.ingredient.create({
    data: {
      name: body.name,
      nameEs: body.nameEs,
      unit: body.unit,
      currentStock: body.currentStock || 0,
      lowStockThreshold: body.lowStockThreshold || 0,
      costPerUnit: body.costPerUnit || 0,
    },
  });
  return NextResponse.json({ data: ingredient }, { status: 201 });
}
