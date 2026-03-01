import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, nameEs, type, value, code, active } = await request.json();

  const discount = await prisma.discount.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(nameEs !== undefined && { nameEs }),
      ...(type !== undefined && { type }),
      ...(value !== undefined && { value }),
      ...(code !== undefined && { code: code || null }),
      ...(active !== undefined && { active }),
    },
  });

  return NextResponse.json({ data: discount });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.discount.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
