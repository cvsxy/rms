import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;

  const discounts = await prisma.orderDiscount.findMany({
    where: { orderId },
    include: {
      discount: true,
      appliedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: discounts });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await params;
  const { discountId, type, value, note } = await request.json();

  if (!type || value == null) {
    return NextResponse.json({ error: "Missing type or value" }, { status: 400 });
  }

  // Validate discount type
  if (type !== "PERCENTAGE" && type !== "FIXED") {
    return NextResponse.json({ error: "Type must be PERCENTAGE or FIXED" }, { status: 400 });
  }

  // Validate discount value
  const numValue = Number(value);
  if (isNaN(numValue) || numValue <= 0) {
    return NextResponse.json({ error: "Discount value must be a positive number" }, { status: 400 });
  }
  if (type === "PERCENTAGE" && numValue > 100) {
    return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { where: { status: { not: "CANCELLED" } } } },
  });
  if (!order || order.status === "CLOSED" || order.status === "CANCELLED") {
    return NextResponse.json({ error: "Order not available for discounts" }, { status: 400 });
  }

  // For fixed discounts, validate against order subtotal
  if (type === "FIXED") {
    let subtotal = 0;
    for (const item of order.items) {
      subtotal += Number(item.unitPrice) * item.quantity;
    }
    if (numValue > subtotal) {
      return NextResponse.json({ error: "Fixed discount cannot exceed order subtotal" }, { status: 400 });
    }
  }

  const orderDiscount = await prisma.orderDiscount.create({
    data: {
      orderId,
      discountId: discountId || null,
      type,
      value,
      appliedById: session.userId,
      note: note || null,
    },
    include: {
      discount: true,
      appliedBy: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    action: "DISCOUNT_APPLIED",
    userId: session.userId,
    orderId,
    details: {
      discountId,
      type,
      value: Number(value),
      note,
    },
  });

  return NextResponse.json({ data: orderDiscount }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await params;
  const { searchParams } = new URL(request.url);
  const discountApplicationId = searchParams.get("discountId");

  if (!discountApplicationId) {
    return NextResponse.json({ error: "Missing discountId param" }, { status: 400 });
  }

  await prisma.orderDiscount.delete({
    where: { id: discountApplicationId, orderId },
  });

  return NextResponse.json({ success: true });
}
