import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;
  const { items } = await request.json();

  const createdItems = [];

  for (const item of items) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: item.menuItemId },
      include: { modifiers: true },
    });
    if (!menuItem) continue;

    let unitPrice = Number(menuItem.price);
    const modifierData = [];
    if (item.modifierIds?.length) {
      for (const modId of item.modifierIds) {
        const mod = menuItem.modifiers.find((m) => m.id === modId);
        if (mod) {
          unitPrice += Number(mod.priceAdj);
          modifierData.push({ modifierId: mod.id, priceAdj: Number(mod.priceAdj) });
        }
      }
    }

    const orderItem = await prisma.orderItem.create({
      data: {
        orderId,
        menuItemId: item.menuItemId,
        quantity: item.quantity || 1,
        unitPrice,
        notes: item.notes || null,
        status: "SENT",
        sentAt: new Date(),
        modifiers: modifierData.length ? { create: modifierData } : undefined,
      },
      include: {
        menuItem: true,
        modifiers: { include: { modifier: true } },
      },
    });
    createdItems.push(orderItem);
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: "SUBMITTED" },
    include: { table: true, server: { select: { id: true, name: true } } },
  });

  // Group items by destination and trigger Pusher events
  const kitchenItems = createdItems.filter((i) => i.menuItem.destination === "KITCHEN");
  const barItems = createdItems.filter((i) => i.menuItem.destination === "BAR");

  const orderPayload = {
    orderId,
    tableNumber: order.table.number,
    tableName: order.table.name,
    serverName: order.server.name,
  };

  try {
    if (kitchenItems.length > 0) {
      await pusher.trigger("private-kitchen", "new-items", {
        ...orderPayload,
        items: kitchenItems,
      });
    }
    if (barItems.length > 0) {
      await pusher.trigger("private-bar", "new-items", {
        ...orderPayload,
        items: barItems,
      });
    }
  } catch {
    // Pusher not configured yet — silently continue
  }

  return NextResponse.json({ data: createdItems }, { status: 201 });
}
