import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";
import { sendPushToUser } from "@/lib/webpush";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status, voidReason, voidNote } = await request.json();

  // Voiding requires authentication (kitchen/bar displays can still mark READY/PREPARING/SERVED)
  if (status === "CANCELLED") {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
  }

  // Validate status value
  const VALID_STATUSES = ["PENDING", "SENT", "PREPARING", "READY", "SERVED", "CANCELLED"];
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Enforce status state machine — prevent invalid transitions
  const currentItem = await prisma.orderItem.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!currentItem) {
    return NextResponse.json({ error: "Order item not found" }, { status: 404 });
  }

  const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ["SENT", "CANCELLED"],
    SENT: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: [],
    CANCELLED: [],
  };

  const allowed = VALID_TRANSITIONS[currentItem.status] || [];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${currentItem.status} to ${status}` },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "READY") updateData.readyAt = new Date();
  if (status === "SERVED") updateData.servedAt = new Date();
  if (status === "CANCELLED") {
    if (voidReason) updateData.voidReason = voidReason;
    if (voidNote) updateData.voidNote = voidNote;
  }

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
      const displayChannel = orderItem.menuItem.destination === "KITCHEN" ? "kitchen" : "bar";
      await pusher.trigger(displayChannel, "item-status-changed", {
        orderItemId: orderItem.id,
        status: "READY",
        orderId: orderItem.orderId,
      });
    } catch {
      // Pusher not configured yet — silently continue
    }

    // Send Web Push notification (for background/closed PWA)
    try {
      const itemName =
        orderItem.menuItem.nameEs || orderItem.menuItem.name;
      await sendPushToUser(orderItem.order.server.id, {
        title: `Mesa ${orderItem.order.table.number}`,
        body: `${itemName} listo — ${destination}`,
        tag: `ready-${orderItem.id}`,
        data: {
          orderItemId: orderItem.id,
          orderId: orderItem.orderId,
          tableNumber: orderItem.order.table.number,
        },
      });
    } catch {
      // Web push not configured — silently continue
    }
  }

  // Audit log for voids
  if (status === "CANCELLED") {
    const session = await getSession();
    if (session) {
      await createAuditLog({
        action: "ITEM_VOIDED",
        userId: session.userId,
        orderId: orderItem.orderId,
        orderItemId: orderItem.id,
        details: {
          itemName: orderItem.menuItem.name,
          itemNameEs: orderItem.menuItem.nameEs,
          quantity: orderItem.quantity,
          voidReason: voidReason || null,
          voidNote: voidNote || null,
          tableNumber: orderItem.order.table.number,
        },
      });
    }
  }

  return NextResponse.json({ data: orderItem });
}
