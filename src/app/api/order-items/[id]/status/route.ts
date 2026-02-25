import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  return NextResponse.json({ data: orderItem });
}
