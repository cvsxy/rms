import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const paymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(["CASH", "CARD"]),
  tip: z.number().min(0).default(0),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { orderId, method, tip } = parsed.data;

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

  // Prevent duplicate payments
  const existingPayment = await prisma.payment.findFirst({ where: { orderId } });
  if (existingPayment) {
    return NextResponse.json({ error: "Payment already processed for this order" }, { status: 409 });
  }

  // Prevent payment on closed/cancelled orders
  if (order.status === "CLOSED" || order.status === "CANCELLED") {
    return NextResponse.json({ error: "Order is already closed or cancelled" }, { status: 400 });
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

  // Atomic transaction: create payment + close order + release table
  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: { orderId, method, subtotal, tax, total, tip, discount: totalDiscount },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: "CLOSED" },
    });

    const otherActiveOrders = await tx.order.count({
      where: {
        tableId: order.tableId,
        id: { not: orderId },
        status: { in: ["OPEN", "SUBMITTED", "COMPLETED"] },
      },
    });

    if (otherActiveOrders === 0) {
      await tx.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE" },
      });
    }

    return p;
  });

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

  // Update customer stats
  if (order.customerId) {
    await prisma.customer.update({
      where: { id: order.customerId },
      data: {
        totalVisits: { increment: 1 },
        totalSpent: { increment: total },
        lastVisit: new Date(),
      },
    });
  }

  // Auto-earn loyalty points
  if (order.customerId) {
    const member = await prisma.loyaltyMember.findUnique({
      where: { customerId: order.customerId },
      include: { program: true },
    });
    if (member && member.program.active) {
      const pointsEarned = Math.floor(Number(total) * Number(member.program.pointsPerPeso));
      if (pointsEarned > 0) {
        await prisma.loyaltyMember.update({
          where: { id: member.id },
          data: {
            pointsBalance: { increment: pointsEarned },
            totalEarned: { increment: pointsEarned },
          },
        });
        await prisma.loyaltyTransaction.create({
          data: {
            memberId: member.id,
            type: "EARN",
            points: pointsEarned,
            orderId,
            description: `Earned ${pointsEarned} points`,
          },
        });
      }
    }
  }

  return NextResponse.json({ data: payment }, { status: 201 });
}
