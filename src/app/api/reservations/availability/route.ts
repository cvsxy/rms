import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Default time slots the restaurant accepts reservations for.
// 30-minute intervals from 12:00 to 22:00 (noon to 10 PM).
const DEFAULT_TIME_SLOTS = [
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00",
];

// Average reservation duration in minutes (used for overlap detection).
const RESERVATION_DURATION_MINUTES = 90;

// ---------------------------------------------------------------------------
// GET /api/reservations/availability?date=2026-03-15&partySize=4
//   Public endpoint (no auth required).
//   Returns which time slots are available on the given date by checking
//   existing reservations against total table capacity.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const partySizeParam = searchParams.get("partySize");

  if (!dateParam) {
    return NextResponse.json(
      { error: "date query parameter is required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const dateObj = new Date(dateParam);
  if (isNaN(dateObj.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format" },
      { status: 400 },
    );
  }

  const partySize = partySizeParam ? parseInt(partySizeParam) : 1;

  // Get all active tables that can fit the party size
  const suitableTables = await prisma.restaurantTable.findMany({
    where: {
      active: true,
      seats: { gte: partySize },
    },
    select: { id: true, number: true, seats: true },
    orderBy: { seats: "asc" },
  });

  if (suitableTables.length === 0) {
    return NextResponse.json({
      data: {
        date: dateParam,
        partySize,
        totalSuitableTables: 0,
        slots: DEFAULT_TIME_SLOTS.map((time) => ({
          time,
          available: false,
          tablesAvailable: 0,
        })),
      },
    });
  }

  // Get all non-cancelled reservations for the requested date
  const dayStart = new Date(dateParam);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dateParam);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const existingReservations = await prisma.reservation.findMany({
    where: {
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
    },
    select: { time: true, tableId: true, partySize: true },
  });

  // For each time slot, calculate how many suitable tables are free.
  // A reservation at time T blocks the table for RESERVATION_DURATION_MINUTES.
  const slots = DEFAULT_TIME_SLOTS.map((slotTime) => {
    const slotMinutes = timeToMinutes(slotTime);

    // Find which tables are blocked at this slot time
    const blockedTableIds = new Set<string>();
    const unassignedBlockCount = { count: 0 };

    for (const res of existingReservations) {
      const resMinutes = timeToMinutes(res.time);
      // Check if the reservation overlaps with this slot
      // A reservation at resMinutes blocks [resMinutes, resMinutes + duration)
      // A new reservation at slotMinutes would block [slotMinutes, slotMinutes + duration)
      // They overlap if: slotMinutes < resMinutes + duration AND resMinutes < slotMinutes + duration
      if (
        slotMinutes < resMinutes + RESERVATION_DURATION_MINUTES &&
        resMinutes < slotMinutes + RESERVATION_DURATION_MINUTES
      ) {
        if (res.tableId) {
          blockedTableIds.add(res.tableId);
        } else {
          // Reservation without assigned table still reduces capacity
          unassignedBlockCount.count++;
        }
      }
    }

    // Count suitable tables that are not blocked by an assigned reservation
    const freeAssignedTables = suitableTables.filter(
      (t) => !blockedTableIds.has(t.id),
    );

    // Subtract unassigned reservation blocks from available count
    const tablesAvailable = Math.max(
      0,
      freeAssignedTables.length - unassignedBlockCount.count,
    );

    return {
      time: slotTime,
      available: tablesAvailable > 0,
      tablesAvailable,
    };
  });

  return NextResponse.json({
    data: {
      date: dateParam,
      partySize,
      totalSuitableTables: suitableTables.length,
      slots,
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
