import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications?since=TIMESTAMP
 * Returns order items marked READY for the current server since the given timestamp.
 * Used to catch up on missed notifications when the PWA regains focus.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");

  const sinceDate = since ? new Date(Number(since)) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  const readyItems = await prisma.orderItem.findMany({
    where: {
      status: "READY",
      readyAt: { gte: sinceDate },
      order: { serverId: session.userId },
    },
    include: {
      menuItem: { select: { name: true, nameEs: true, destination: true } },
      order: { include: { table: { select: { number: true, name: true } } } },
    },
    orderBy: { readyAt: "desc" },
  });

  const notifications = readyItems.map((item) => ({
    id: `${item.id}-${item.readyAt?.getTime() || Date.now()}`,
    orderItemId: item.id,
    itemName: item.menuItem.name,
    itemNameEs: item.menuItem.nameEs,
    destination: item.menuItem.destination === "KITCHEN" ? "Cocina" : "Barra",
    tableNumber: item.order.table.number,
    tableName: item.order.table.name,
    timestamp: item.readyAt?.getTime() || Date.now(),
    read: false,
  }));

  return NextResponse.json({ data: notifications });
}
