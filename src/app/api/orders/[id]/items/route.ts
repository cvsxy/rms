import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "SUBMITTED" },
  });

  return NextResponse.json({ data: createdItems }, { status: 201 });
}
