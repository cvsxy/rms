import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateProgramSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nameEs: z.string().min(1).max(100).optional(),
  pointsPerPeso: z.number().positive().optional(),
  active: z.boolean().optional(),
});

/**
 * GET /api/loyalty/program
 * Get the active loyalty program (admin only)
 */
export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const program = await prisma.loyaltyProgram.findFirst({
    where: { active: true },
    include: {
      _count: {
        select: {
          rewards: { where: { active: true } },
          members: true,
        },
      },
    },
  });

  return NextResponse.json({ data: program || null });
}

const createProgramSchema = z.object({
  name: z.string().min(1).max(100),
  nameEs: z.string().min(1).max(100),
  pointsPerPeso: z.number().positive().default(1),
  active: z.boolean().default(true),
});

/**
 * POST /api/loyalty/program
 * Create a new loyalty program (admin only)
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const body = await request.json();
  const parsed = createProgramSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const program = await prisma.loyaltyProgram.create({
    data: {
      name: parsed.data.name,
      nameEs: parsed.data.nameEs,
      pointsPerPeso: parsed.data.pointsPerPeso,
      active: parsed.data.active,
    },
  });

  return NextResponse.json({ data: program }, { status: 201 });
}

/**
 * PUT /api/loyalty/program
 * Update the active loyalty program settings (admin only)
 */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const body = await request.json();
  const parsed = updateProgramSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const program = await prisma.loyaltyProgram.findFirst({
    where: { active: true },
  });

  if (!program) {
    return NextResponse.json({ error: "No active loyalty program found" }, { status: 404 });
  }

  const updated = await prisma.loyaltyProgram.update({
    where: { id: program.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.nameEs !== undefined && { nameEs: parsed.data.nameEs }),
      ...(parsed.data.pointsPerPeso !== undefined && { pointsPerPeso: parsed.data.pointsPerPeso }),
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
    },
  });

  return NextResponse.json({ data: updated });
}
