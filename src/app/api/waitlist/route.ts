import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const createSchema = z.object({
  guestName: z.string().min(1),
  guestPhone: z.string().min(1),
  partySize: z.number().int().min(1),
  estimatedWait: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/waitlist — List active waitlist entries (not seated, not cancelled)
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const entries = await prisma.waitlistEntry.findMany({
    where: {
      seatedAt: null,
      cancelledAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: entries });
}

/**
 * POST /api/waitlist — Add a guest to the waitlist
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const entry = await prisma.waitlistEntry.create({
    data: {
      guestName: parsed.data.guestName,
      guestPhone: parsed.data.guestPhone,
      partySize: parsed.data.partySize,
      estimatedWait: parsed.data.estimatedWait ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({ data: entry }, { status: 201 });
}
