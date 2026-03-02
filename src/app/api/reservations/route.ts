import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/reservations — List reservations with optional date/status filters
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // ISO date string e.g. "2026-03-01"
  const status = searchParams.get("status"); // ReservationStatus enum value
  const search = searchParams.get("search"); // guest name or phone search
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};

  if (date) {
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);
    where.date = { gte: dayStart, lte: dayEnd };
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { guestName: { contains: search, mode: "insensitive" } },
      { guestPhone: { contains: search } },
    ];
  }

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: [{ date: "asc" }, { time: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        table: { select: { id: true, number: true, seats: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  return NextResponse.json({
    data: reservations,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

// ---------------------------------------------------------------------------
// POST /api/reservations — Create a new reservation
// ---------------------------------------------------------------------------
const createReservationSchema = z.object({
  guestName: z.string().min(1).max(100),
  guestPhone: z.string().min(10).max(20),
  guestEmail: z.string().email().optional().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Invalid date format"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  partySize: z.number().int().positive(),
  tableId: z.string().optional(),
  source: z
    .enum(["PHONE", "WALKIN", "WHATSAPP", "WEBSITE", "MANUAL"])
    .optional(),
  notes: z.string().max(500).optional(),
  customerId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const {
    guestName,
    guestPhone,
    guestEmail,
    date,
    time,
    partySize,
    tableId,
    source,
    notes,
    customerId,
  } = parsed.data;

  // If a specific table is requested, validate it exists and can fit the party
  if (tableId) {
    const table = await prisma.restaurantTable.findUnique({
      where: { id: tableId },
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
    if (table.seats < partySize) {
      return NextResponse.json(
        { error: "Table does not have enough seats for the party size" },
        { status: 400 },
      );
    }

    // Check for conflicting reservation on this table at this date/time
    const dateObj = new Date(date);
    dateObj.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setUTCHours(23, 59, 59, 999);

    const conflicting = await prisma.reservation.findFirst({
      where: {
        tableId,
        date: { gte: dateObj, lte: dateEnd },
        time,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });
    if (conflicting) {
      return NextResponse.json(
        { error: "Table already has a reservation at this time" },
        { status: 409 },
      );
    }
  }

  // Resolve customer: use provided customerId, or auto-link by phone
  let resolvedCustomerId = customerId || null;
  if (!resolvedCustomerId && guestPhone) {
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: guestPhone },
    });
    if (existingCustomer) {
      resolvedCustomerId = existingCustomer.id;
    }
  }

  const reservation = await prisma.reservation.create({
    data: {
      guestName,
      guestPhone,
      guestEmail: guestEmail || null,
      date: new Date(date),
      time,
      partySize,
      tableId: tableId || null,
      status: "PENDING",
      source: source || "MANUAL",
      notes: notes || null,
      customerId: resolvedCustomerId,
    },
    include: {
      table: { select: { id: true, number: true, seats: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json({ data: reservation }, { status: 201 });
}
