import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  pin: z.string().min(4).max(6).regex(/^\d+$/, "PIN must be digits only"),
});

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
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = createServerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, pin } = parsed.data;
  const hashedPin = await hash(pin, 12);
  const server = await prisma.user.create({
    data: { name, pin: hashedPin, role: "SERVER" },
    select: { id: true, name: true, active: true, createdAt: true },
  });
  return NextResponse.json({ data: server }, { status: 201 });
}
