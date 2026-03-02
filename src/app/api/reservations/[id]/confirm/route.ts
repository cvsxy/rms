import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/reservations/[id]/confirm — Confirm a pending reservation
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  if (reservation.status !== "PENDING") {
    return NextResponse.json(
      {
        error: `Cannot confirm reservation with status ${reservation.status}. Only PENDING reservations can be confirmed.`,
      },
      { status: 400 },
    );
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
    },
    include: {
      table: { select: { id: true, number: true, seats: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
