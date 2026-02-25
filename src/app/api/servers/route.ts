import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET() {
  const servers = await prisma.user.findMany({
    where: { role: "SERVER", active: true },
    select: {
      id: true,
      name: true,
      active: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: servers });
}

export async function POST(request: NextRequest) {
  const { name, pin } = await request.json();
  const hashedPin = await hash(pin, 12);
  const server = await prisma.user.create({
    data: { name, pin: hashedPin, role: "SERVER" },
    select: { id: true, name: true, active: true, createdAt: true },
  });
  return NextResponse.json({ data: server }, { status: 201 });
}
