import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { orderId, method, tip = 0 } = await request.json();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { where: { status: { not: "CANCELLED" } } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  let subtotal = 0;
  for (const item of order.items) {
    subtotal += Number(item.unitPrice) * item.quantity;
  }

  const taxRate = parseFloat(process.env.NEXT_PUBLIC_TAX_RATE || "0.16");
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const payment = await prisma.payment.create({
    data: { orderId, method, subtotal, tax, total, tip },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CLOSED" },
  });

  const otherActiveOrders = await prisma.order.count({
    where: {
      tableId: order.tableId,
      id: { not: orderId },
      status: { in: ["OPEN", "SUBMITTED", "COMPLETED"] },
    },
  });

  if (otherActiveOrders === 0) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: { status: "AVAILABLE" },
    });
  }

  return NextResponse.json({ data: payment }, { status: 201 });
}
