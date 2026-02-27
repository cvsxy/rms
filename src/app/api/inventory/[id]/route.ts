import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: {
      menuItems: {
        include: {
          menuItem: { select: { id: true, name: true, nameEs: true } },
        },
      },
    },
  });
  if (!ingredient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: ingredient });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { menuItems, ...data } = body;
  const ingredient = await prisma.ingredient.update({
    where: { id },
    data,
  });
  return NextResponse.json({ data: ingredient });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.ingredient.update({
    where: { id },
    data: { active: false },
  });
  return NextResponse.json({ data: { success: true } });
}
