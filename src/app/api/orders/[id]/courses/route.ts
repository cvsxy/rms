import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

/**
 * GET /api/orders/[id]/courses — Get courses for an order with items grouped by courseNumber
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Fetch all course records for this order
  const courses = await prisma.orderCourse.findMany({
    where: { orderId },
    orderBy: { courseNumber: "asc" },
  });

  // Fetch all order items with their courseNumber
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: {
      menuItem: true,
      modifiers: { include: { modifier: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group items by courseNumber (null courseNumber goes into "unassigned")
  const itemsByCourse: Record<string, typeof items> = {};
  for (const item of items) {
    const key = item.courseNumber != null ? String(item.courseNumber) : "unassigned";
    if (!itemsByCourse[key]) itemsByCourse[key] = [];
    itemsByCourse[key].push(item);
  }

  return NextResponse.json({
    data: {
      courses,
      itemsByCourse,
    },
  });
}
