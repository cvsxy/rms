import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";
import { requireAuth } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";

const fireSchema = z.object({
  courseNumber: z.number().int().min(1),
});

/**
 * POST /api/orders/[id]/courses/fire — Fire a specific course
 *
 * Finds all PENDING OrderItems for the given order + courseNumber,
 * updates them to SENT, upserts the OrderCourse record with firedAt,
 * and triggers Pusher events to kitchen/bar channels.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: orderId } = await params;
  const body = await request.json();
  const parsed = fireSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { courseNumber } = parsed.data;

  // Verify the order exists and load table + server info for Pusher payload
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      server: { select: { id: true, name: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Find all PENDING items for this course
  const pendingItems = await prisma.orderItem.findMany({
    where: {
      orderId,
      courseNumber,
      status: "PENDING",
    },
    include: {
      menuItem: true,
      modifiers: { include: { modifier: true } },
    },
  });

  if (pendingItems.length === 0) {
    return NextResponse.json(
      { error: "No pending items found for this course" },
      { status: 404 }
    );
  }

  const now = new Date();

  // Update all pending items to SENT
  await prisma.orderItem.updateMany({
    where: {
      orderId,
      courseNumber,
      status: "PENDING",
    },
    data: {
      status: "SENT",
      sentAt: now,
    },
  });

  // Upsert the OrderCourse record with firedAt
  await prisma.orderCourse.upsert({
    where: {
      orderId_courseNumber: { orderId, courseNumber },
    },
    update: { firedAt: now },
    create: {
      orderId,
      courseNumber,
      firedAt: now,
    },
  });

  // Group fired items by destination (KITCHEN / BAR)
  const kitchenItems = pendingItems.filter(
    (item) => item.menuItem.destination === "KITCHEN"
  );
  const barItems = pendingItems.filter(
    (item) => item.menuItem.destination === "BAR"
  );

  const buildPayload = (items: typeof pendingItems) => ({
    orderId,
    tableNumber: order.table.number,
    tableName: order.table.name,
    serverName: order.server.name,
    items: items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.menuItem.name,
      nameEs: item.menuItem.nameEs,
      quantity: item.quantity,
      notes: item.notes,
      seatNumber: item.seatNumber,
      courseNumber: item.courseNumber,
      modifiers: item.modifiers.map((m) => ({
        name: m.modifier.name,
        nameEs: m.modifier.nameEs,
      })),
    })),
  });

  // Trigger Pusher events (wrapped in try/catch — may not be configured)
  try {
    if (kitchenItems.length > 0) {
      await pusher.trigger("kitchen", "course-fired", buildPayload(kitchenItems));
    }
    if (barItems.length > 0) {
      await pusher.trigger("bar", "course-fired", buildPayload(barItems));
    }
  } catch {
    // Pusher not configured — silently continue
  }

  // Audit log
  await createAuditLog({
    action: "COURSE_FIRED",
    userId: auth.session.userId,
    orderId,
    details: {
      courseNumber,
      itemCount: pendingItems.length,
      tableNumber: order.table.number,
    },
  });

  // Re-fetch the fired items with updated status
  const firedItems = await prisma.orderItem.findMany({
    where: {
      orderId,
      courseNumber,
      status: "SENT",
    },
    include: {
      menuItem: true,
      modifiers: { include: { modifier: true } },
    },
  });

  return NextResponse.json({ data: firedItems });
}
