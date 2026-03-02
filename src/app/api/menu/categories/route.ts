import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

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
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const category = await prisma.menuCategory.create({ data: body });
  return NextResponse.json({ data: category }, { status: 201 });
}
