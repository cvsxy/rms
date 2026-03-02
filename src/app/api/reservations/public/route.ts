import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// In-memory rate limiting: max 10 submissions per IP per 5 minutes
// ---------------------------------------------------------------------------
const submissions = new Map<string, { count: number; resetAt: number }>();
const MAX_SUBMISSIONS = 10;
const WINDOW_MS = 5 * 60_000; // 5 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = submissions.get(ip);
  if (!entry || now > entry.resetAt) return true;
  return entry.count < MAX_SUBMISSIONS;
}

function recordSubmission(ip: string): void {
  const now = Date.now();
  const entry = submissions.get(ip);
  if (!entry || now > entry.resetAt) {
    submissions.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

// ---------------------------------------------------------------------------
// Zod validation schema
// ---------------------------------------------------------------------------
const publicReservationSchema = z.object({
  guestName: z.string().min(1).max(100),
  guestPhone: z.string().min(10).max(20),
  guestEmail: z.string().email().optional().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  partySize: z.number().int().positive().max(20),
  notes: z.string().max(500).optional(),
  website: z.string().optional(), // honeypot field
});

// ---------------------------------------------------------------------------
// POST /api/reservations/public — Public (unauthenticated) reservation from
// embeddable website widget
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    // Rate limit check
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = publicReservationSchema.safeParse(body);
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
      notes,
      website,
    } = parsed.data;

    // Honeypot: bots that fill the hidden "website" field get a silent fake success
    if (website) {
      return NextResponse.json({ data: { id: "ok" } }, { status: 201 });
    }

    // Check if the reservation widget is enabled
    const widgetSetting = await prisma.restaurantSetting.findUnique({
      where: { key: "widget_enabled" },
    });
    if (widgetSetting?.value === "false") {
      return NextResponse.json(
        { error: "Online reservations are currently disabled" },
        { status: 403 },
      );
    }

    // --- Availability check ---
    // Find tables that can seat this party
    const suitableTables = await prisma.restaurantTable.findMany({
      where: { active: true, seats: { gte: partySize } },
      select: { id: true },
    });

    if (suitableTables.length === 0) {
      return NextResponse.json(
        { error: "No tables available for this party size" },
        { status: 409 },
      );
    }

    const suitableTableIds = suitableTables.map((t) => t.id);

    // Parse the requested reservation start time and compute a 90-minute window
    const RESERVATION_DURATION_MINUTES = 90;
    const requestedDate = new Date(date);
    requestedDate.setUTCHours(0, 0, 0, 0);
    const requestedDateEnd = new Date(date);
    requestedDateEnd.setUTCHours(23, 59, 59, 999);

    const [reqHour, reqMinute] = time.split(":").map(Number);
    const reqStartMinutes = reqHour * 60 + reqMinute;
    const reqEndMinutes = reqStartMinutes + RESERVATION_DURATION_MINUTES;

    // Find existing reservations on that date for suitable tables
    const existingReservations = await prisma.reservation.findMany({
      where: {
        date: { gte: requestedDate, lte: requestedDateEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
        tableId: { in: suitableTableIds },
      },
      select: { tableId: true, time: true },
    });

    // Build a set of table IDs that are occupied (overlapping) at the requested time
    const occupiedTableIds = new Set<string>();
    for (const res of existingReservations) {
      if (!res.tableId) continue;
      const [h, m] = res.time.split(":").map(Number);
      const existStart = h * 60 + m;
      const existEnd = existStart + RESERVATION_DURATION_MINUTES;

      // Overlap check: two intervals [a,b) and [c,d) overlap if a < d && c < b
      if (reqStartMinutes < existEnd && existStart < reqEndMinutes) {
        occupiedTableIds.add(res.tableId);
      }
    }

    // Check if at least one suitable table is still free
    const hasAvailableTable = suitableTableIds.some(
      (id) => !occupiedTableIds.has(id),
    );
    if (!hasAvailableTable) {
      return NextResponse.json(
        { error: "No availability for the requested date and time" },
        { status: 409 },
      );
    }

    // --- Auto-link customer by phone ---
    let customerId: string | null = null;
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: guestPhone },
    });
    if (existingCustomer) {
      customerId = existingCustomer.id;
    }

    // --- Create reservation ---
    const reservation = await prisma.reservation.create({
      data: {
        guestName,
        guestPhone,
        guestEmail: guestEmail || null,
        date: new Date(date),
        time,
        partySize,
        tableId: null, // No table assigned — staff will assign later
        status: "PENDING",
        source: "WEBSITE",
        notes: notes || null,
        customerId,
      },
    });

    // Record the submission for rate limiting
    recordSubmission(ip);

    return NextResponse.json({ data: reservation }, { status: 201 });
  } catch (error) {
    console.error("Public reservation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
