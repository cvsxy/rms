import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const { orderId, method, tip = 0 } = await request.json();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { where: { status: { not: "CANCELLED" } } },
      discounts: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  let subtotal = 0;
  for (const item of order.items) {
    subtotal += Number(item.unitPrice) * item.quantity;
  }

  // Calculate total discount
  let totalDiscount = 0;
  for (const d of order.discounts) {
    if (d.type === "PERCENTAGE") {
      totalDiscount += subtotal * Number(d.value) / 100;
    } else {
      totalDiscount += Number(d.value);
    }
  }
  totalDiscount = Math.min(totalDiscount, subtotal);

  const discountedSubtotal = subtotal - totalDiscount;
  const taxRate = parseFloat(process.env.NEXT_PUBLIC_TAX_RATE || "0.16");
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + tax;

  const payment = await prisma.payment.create({
    data: { orderId, method, subtotal, tax, total, tip, discount: totalDiscount },
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

  // Audit log
  const session = await getSession();
  if (session) {
    await createAuditLog({
      action: "PAYMENT_PROCESSED",
      userId: session.userId,
      orderId,
      details: {
        method,
        subtotal,
        discount: totalDiscount,
        tax,
        total,
        tip,
      },
    });
  }

  return NextResponse.json({ data: payment }, { status: 201 });
}
