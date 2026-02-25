import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const table = await prisma.restaurantTable.update({ where: { id }, data: body });
  return NextResponse.json({ data: table });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.restaurantTable.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ data: { success: true } });
}
