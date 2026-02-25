import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.name) updateData.name = body.name;
  if (body.pin) updateData.pin = await hash(body.pin, 12);
  if (typeof body.active === "boolean") updateData.active = body.active;

  const server = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, active: true, createdAt: true },
  });
  return NextResponse.json({ data: server });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.user.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ data: { success: true } });
}
