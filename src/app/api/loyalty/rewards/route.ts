import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createRewardSchema = z.object({
  programId: z.string().cuid(),
  name: z.string().min(1).max(100),
  nameEs: z.string().min(1).max(100),
  pointsCost: z.number().int().positive(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive(),
}).refine(
  (data) => !(data.type === "PERCENTAGE" && data.value > 100),
  { message: "Percentage reward cannot exceed 100%", path: ["value"] }
);

/**
 * GET /api/loyalty/rewards
 * List all active loyalty rewards (any authenticated user)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("all") === "true";

  const rewards = await prisma.loyaltyReward.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { pointsCost: "asc" },
    include: {
      program: {
        select: { id: true, name: true, nameEs: true },
      },
    },
  });

  return NextResponse.json({ data: rewards });
}

/**
 * POST /api/loyalty/rewards
 * Create a new loyalty reward (admin only)
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const body = await request.json();
  const parsed = createRewardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { programId, name, nameEs, pointsCost, type, value } = parsed.data;

  // Verify the program exists
  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
  });
  if (!program) {
    return NextResponse.json({ error: "Loyalty program not found" }, { status: 404 });
  }

  const reward = await prisma.loyaltyReward.create({
    data: {
      programId,
      name,
      nameEs,
      pointsCost,
      type,
      value,
    },
  });

  return NextResponse.json({ data: reward }, { status: 201 });
}
