import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await request.json();

  // When cancelling order, also cancel all non-terminal items
  if (status === "CANCELLED") {
    await prisma.orderItem.updateMany({
      where: {
        orderId: id,
        status: { notIn: ["SERVED", "CANCELLED"] },
      },
      data: { status: "CANCELLED" },
    });
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: { table: true },
  });

  if (status === "CLOSED" || status === "CANCELLED") {
    const otherActiveOrders = await prisma.order.count({
      where: {
        tableId: order.tableId,
        id: { not: id },
        status: { in: ["OPEN", "SUBMITTED", "COMPLETED"] },
      },
    });
    if (otherActiveOrders === 0) {
      await prisma.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE" },
      });
    }
  }

  return NextResponse.json({ data: order });
}
