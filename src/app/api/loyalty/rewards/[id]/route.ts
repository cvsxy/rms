import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

const updateRewardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nameEs: z.string().min(1).max(100).optional(),
  pointsCost: z.number().int().positive().optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  value: z.number().positive().optional(),
  active: z.boolean().optional(),
});

/**
 * PUT /api/loyalty/rewards/[id]
 * Update a loyalty reward (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await params;

  const body = await request.json();
  const parsed = updateRewardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Validate percentage not over 100 if both type and value provided
  const data = parsed.data;
  if (data.type === "PERCENTAGE" && data.value !== undefined && data.value > 100) {
    return NextResponse.json(
      { error: "Percentage reward cannot exceed 100%" },
      { status: 400 }
    );
  }

  const existing = await prisma.loyaltyReward.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  }

  // If only value is provided, check against existing type
  if (
    data.value !== undefined &&
    data.type === undefined &&
    existing.type === "PERCENTAGE" &&
    data.value > 100
  ) {
    return NextResponse.json(
      { error: "Percentage reward cannot exceed 100%" },
      { status: 400 }
    );
  }

  const updated = await prisma.loyaltyReward.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.nameEs !== undefined && { nameEs: data.nameEs }),
      ...(data.pointsCost !== undefined && { pointsCost: data.pointsCost }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.value !== undefined && { value: data.value }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });

  return NextResponse.json({ data: updated });
}
