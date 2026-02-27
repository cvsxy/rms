import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.menuCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          modifiers: { where: { active: true } },
          ingredients: { include: { ingredient: true } },
        },
      },
    },
  });
  return NextResponse.json({ data: categories });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const category = await prisma.menuCategory.create({ data: body });
  return NextResponse.json({ data: category }, { status: 201 });
}
