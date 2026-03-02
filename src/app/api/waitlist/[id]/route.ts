import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const patchSchema = z.object({
  action: z.enum(["notify", "seat", "cancel"]),
});

/**
 * PATCH /api/waitlist/[id] — Update a waitlist entry (notify, seat, or cancel)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.waitlistEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  let updateData: Record<string, unknown> = {};

  switch (parsed.data.action) {
    case "notify":
      updateData = { notifiedAt: now };
      break;
    case "seat":
      updateData = { seatedAt: now };
      break;
    case "cancel":
      updateData = { cancelledAt: now };
      break;
  }

  const entry = await prisma.waitlistEntry.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ data: entry });
}

/**
 * DELETE /api/waitlist/[id] — Hard delete a waitlist entry
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const existing = await prisma.waitlistEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.waitlistEntry.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
