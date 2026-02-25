import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const serverId = searchParams.get("serverId");
  const tableId = searchParams.get("tableId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (serverId) where.serverId = serverId;
  if (tableId) where.tableId = tableId;
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    where.createdAt = dateFilter;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      table: true,
      server: { select: { id: true, name: true } },
      items: {
        include: {
          menuItem: true,
          modifiers: { include: { modifier: true } },
        },
      },
      payment: true,
    },
  });
  return NextResponse.json({ data: orders });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { tableId } = await request.json();

  const existingOrder = await prisma.order.findFirst({
    where: { tableId, status: { in: ["OPEN", "SUBMITTED", "COMPLETED"] } },
    include: {
      items: { include: { menuItem: true, modifiers: { include: { modifier: true } } } },
      table: true,
      server: { select: { id: true, name: true } },
    },
  });

  if (existingOrder) {
    return NextResponse.json({ data: existingOrder });
  }

  const order = await prisma.order.create({
    data: { tableId, serverId: session.userId },
    include: {
      items: { include: { menuItem: true, modifiers: { include: { modifier: true } } } },
      table: true,
      server: { select: { id: true, name: true } },
    },
  });

  await prisma.restaurantTable.update({
    where: { id: tableId },
    data: { status: "OCCUPIED" },
  });

  return NextResponse.json({ data: order }, { status: 201 });
}
