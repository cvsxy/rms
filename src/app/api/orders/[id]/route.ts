import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      server: { select: { id: true, name: true } },
      items: {
        include: {
          menuItem: true,
          modifiers: { include: { modifier: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      payment: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: order });
}
