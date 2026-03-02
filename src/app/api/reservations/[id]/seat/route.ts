import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/reservations/[id]/seat — Seat a reservation
//   - Sets status to SEATED + seatedAt timestamp
//   - Marks the assigned table as OCCUPIED
//   - Creates a new Order linked to the table + customer
//   - Uses the authenticated server's userId as serverId on the Order
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      table: true,
      customer: { select: { id: true, name: true } },
    },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  // Only PENDING or CONFIRMED reservations can be seated
  if (!["PENDING", "CONFIRMED"].includes(reservation.status)) {
    return NextResponse.json(
      {
        error: `Cannot seat reservation with status ${reservation.status}. Only PENDING or CONFIRMED reservations can be seated.`,
      },
      { status: 400 },
    );
  }

  // A table must be assigned before seating
  if (!reservation.tableId || !reservation.table) {
    return NextResponse.json(
      {
        error:
          "Cannot seat reservation without an assigned table. Please assign a table first.",
      },
      { status: 400 },
    );
  }

  // Check the table is not already occupied by another active order
  const activeOrder = await prisma.order.findFirst({
    where: {
      tableId: reservation.tableId,
      status: { in: ["OPEN", "SUBMITTED", "COMPLETED"] },
    },
  });

  if (activeOrder) {
    return NextResponse.json(
      {
        error: `Table ${reservation.table.number} is currently occupied by an active order. Please clear the table first.`,
      },
      { status: 409 },
    );
  }

  const serverId = auth.session.userId;

  // Use a transaction to atomically update reservation, table, and create order
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update reservation status to SEATED
    const updatedReservation = await tx.reservation.update({
      where: { id },
      data: {
        status: "SEATED",
        seatedAt: new Date(),
      },
      include: {
        table: { select: { id: true, number: true, seats: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    // 2. Mark the table as OCCUPIED
    await tx.restaurantTable.update({
      where: { id: reservation.tableId! },
      data: { status: "OCCUPIED" },
    });

    // 3. Create a new Order linked to the table and (optionally) the customer
    const order = await tx.order.create({
      data: {
        tableId: reservation.tableId!,
        serverId,
        customerId: reservation.customerId || null,
      },
      include: {
        table: true,
        server: { select: { id: true, name: true } },
        items: {
          include: {
            menuItem: true,
            modifiers: { include: { modifier: true } },
          },
        },
      },
    });

    return { reservation: updatedReservation, order };
  });

  return NextResponse.json({ data: result });
}
