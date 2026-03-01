import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    ordersByStatus,
    kitchenQueue,
    barQueue,
    serverWorkload,
    prepTimeItems,
    items86d,
  ] = await Promise.all([
    // Active orders grouped by status
    prisma.order.groupBy({
      by: ["status"],
      where: { status: { in: ["OPEN", "SUBMITTED", "COMPLETED"] } },
      _count: true,
    }),

    // Kitchen queue: items SENT or PREPARING with KITCHEN destination
    prisma.orderItem.count({
      where: {
        status: { in: ["SENT", "PREPARING"] },
        menuItem: { destination: "KITCHEN" },
      },
    }),

    // Bar queue: items SENT or PREPARING with BAR destination
    prisma.orderItem.count({
      where: {
        status: { in: ["SENT", "PREPARING"] },
        menuItem: { destination: "BAR" },
      },
    }),

    // Server workload: tables and active items per server
    prisma.order.findMany({
      where: { status: { in: ["OPEN", "SUBMITTED", "COMPLETED"] } },
      select: {
        serverId: true,
        server: { select: { id: true, name: true } },
        tableId: true,
        _count: { select: { items: { where: { status: { notIn: ["SERVED", "CANCELLED"] } } } } },
      },
    }),

    // Prep time: items that became READY today (to compute average)
    prisma.orderItem.findMany({
      where: {
        readyAt: { not: null, gte: todayStart },
        sentAt: { not: null },
        status: { in: ["READY", "SERVED"] },
      },
      select: { sentAt: true, readyAt: true },
    }),

    // 86'd items count
    prisma.menuItem.count({
      where: { active: true, available: false },
    }),
  ]);

  // Compute average prep time in minutes
  let avgPrepTimeMinutes = 0;
  if (prepTimeItems.length > 0) {
    const totalMs = prepTimeItems.reduce((sum, item) => {
      return sum + (item.readyAt!.getTime() - item.sentAt!.getTime());
    }, 0);
    avgPrepTimeMinutes = Math.round(totalMs / prepTimeItems.length / 60000);
  }

  // Aggregate server workload
  const serverMap = new Map<string, { name: string; tables: Set<string>; activeItems: number }>();
  for (const order of serverWorkload) {
    const existing = serverMap.get(order.serverId);
    if (existing) {
      existing.tables.add(order.tableId);
      existing.activeItems += order._count.items;
    } else {
      serverMap.set(order.serverId, {
        name: order.server.name,
        tables: new Set([order.tableId]),
        activeItems: order._count.items,
      });
    }
  }

  const servers = Array.from(serverMap.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    tables: data.tables.size,
    activeItems: data.activeItems,
  }));

  // Format order status counts
  const statusCounts: Record<string, number> = {};
  let totalActive = 0;
  for (const group of ordersByStatus) {
    statusCounts[group.status] = group._count;
    totalActive += group._count;
  }

  return NextResponse.json({
    data: {
      activeOrders: totalActive,
      ordersByStatus: statusCounts,
      kitchenQueue,
      barQueue,
      avgPrepTimeMinutes,
      servers,
      items86d,
    },
  });
}
