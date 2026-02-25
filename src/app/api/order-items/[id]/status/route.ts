import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await request.json();

  const updateData: Record<string, unknown> = { status };
  if (status === "READY") updateData.readyAt = new Date();
  if (status === "SERVED") updateData.servedAt = new Date();

  const orderItem = await prisma.orderItem.update({
    where: { id },
    data: updateData,
    include: {
      menuItem: true,
      order: { include: { table: true, server: { select: { id: true, name: true } } } },
    },
  });

  if (status === "SERVED") {
    const pendingItems = await prisma.orderItem.count({
      where: { orderId: orderItem.orderId, status: { notIn: ["SERVED", "CANCELLED"] } },
    });
    if (pendingItems === 0) {
      await prisma.order.update({
        where: { id: orderItem.orderId },
        data: { status: "COMPLETED" },
      });
    }
  }

  // Notify server when item is ready
  if (status === "READY") {
    const destination = orderItem.menuItem.destination === "KITCHEN" ? "Cocina" : "Barra";
    try {
      await pusher.trigger(
        `private-server-${orderItem.order.server.id}`,
        "item-ready",
        {
          orderItemId: orderItem.id,
          itemName: orderItem.menuItem.name,
          itemNameEs: orderItem.menuItem.nameEs,
          destination,
          tableNumber: orderItem.order.table.number,
          tableName: orderItem.order.table.name,
        }
      );
      // Also notify the display channel so other display screens update
      const displayChannel = orderItem.menuItem.destination === "KITCHEN" ? "private-kitchen" : "private-bar";
      await pusher.trigger(displayChannel, "item-status-changed", {
        orderItemId: orderItem.id,
        status: "READY",
        orderId: orderItem.orderId,
      });
    } catch {
      // Pusher not configured yet — silently continue
    }
  }

  return NextResponse.json({ data: orderItem });
}
