import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/reservations/[id] — Get reservation detail
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      table: { select: { id: true, number: true, seats: true, status: true } },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          dietaryNotes: true,
          tags: true,
          totalVisits: true,
        },
      },
    },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: reservation });
}

// ---------------------------------------------------------------------------
// PATCH /api/reservations/[id] — Update reservation fields
// ---------------------------------------------------------------------------
const updateReservationSchema = z.object({
  guestName: z.string().min(1).max(100).optional(),
  guestPhone: z.string().min(10).max(20).optional(),
  guestEmail: z.string().email().optional().or(z.literal("")).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, "Invalid date format")
    .optional(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format")
    .optional(),
  partySize: z.number().int().positive().optional(),
  tableId: z.string().nullable().optional(),
  status: z
    .enum(["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .optional(),
  source: z
    .enum(["PHONE", "WALKIN", "WHATSAPP", "WEBSITE", "MANUAL"])
    .optional(),
  notes: z.string().max(500).nullable().optional(),
  customerId: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = updateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};

  if (parsed.data.guestName !== undefined) data.guestName = parsed.data.guestName;
  if (parsed.data.guestPhone !== undefined) data.guestPhone = parsed.data.guestPhone;
  if (parsed.data.guestEmail !== undefined)
    data.guestEmail = parsed.data.guestEmail || null;
  if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
  if (parsed.data.time !== undefined) data.time = parsed.data.time;
  if (parsed.data.partySize !== undefined) data.partySize = parsed.data.partySize;
  if (parsed.data.tableId !== undefined) data.tableId = parsed.data.tableId;
  if (parsed.data.source !== undefined) data.source = parsed.data.source;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.customerId !== undefined) data.customerId = parsed.data.customerId;

  // Handle status changes with timestamp tracking
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
    switch (parsed.data.status) {
      case "CONFIRMED":
        data.confirmedAt = new Date();
        break;
      case "SEATED":
        data.seatedAt = new Date();
        break;
      case "COMPLETED":
        data.completedAt = new Date();
        break;
      case "CANCELLED":
        data.cancelledAt = new Date();
        break;
    }
  }

  // If changing table, validate the new table
  if (parsed.data.tableId) {
    const table = await prisma.restaurantTable.findUnique({
      where: { id: parsed.data.tableId },
    });
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }
    if (!table.active) {
      return NextResponse.json(
        { error: "Table is not active" },
        { status: 400 },
      );
    }
    const effectivePartySize = parsed.data.partySize ?? existing.partySize;
    if (table.seats < effectivePartySize) {
      return NextResponse.json(
        { error: "Table does not have enough seats for the party size" },
        { status: 400 },
      );
    }

    // Check for conflicting reservation on the new table
    const effectiveDate = parsed.data.date
      ? new Date(parsed.data.date)
      : existing.date;
    const effectiveTime = parsed.data.time ?? existing.time;

    const dayStart = new Date(effectiveDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(effectiveDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const conflicting = await prisma.reservation.findFirst({
      where: {
        tableId: parsed.data.tableId,
        date: { gte: dayStart, lte: dayEnd },
        time: effectiveTime,
        status: { in: ["PENDING", "CONFIRMED"] },
        id: { not: id },
      },
    });
    if (conflicting) {
      return NextResponse.json(
        { error: "Table already has a reservation at this time" },
        { status: 409 },
      );
    }
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data,
    include: {
      table: { select: { id: true, number: true, seats: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json({ data: reservation });
}

// ---------------------------------------------------------------------------
// DELETE /api/reservations/[id] — Delete reservation (admin only)
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await params;

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  await prisma.reservation.delete({ where: { id } });

  return NextResponse.json({ message: "Reservation deleted" });
}
