import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createDiscountSchema = z.object({
  name: z.string().min(1).max(100),
  nameEs: z.string().min(1).max(100),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive(),
  code: z.string().max(50).optional(),
}).refine(
  (data) => !(data.type === "PERCENTAGE" && data.value > 100),
  { message: "Percentage discount cannot exceed 100%", path: ["value"] }
);

export const dynamic = "force-dynamic";

export async function GET() {
  const discounts = await prisma.discount.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: discounts });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createDiscountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, nameEs, type, value, code } = parsed.data;

  const discount = await prisma.discount.create({
    data: {
      name,
      nameEs,
      type,
      value,
      code: code || null,
    },
  });

  return NextResponse.json({ data: discount }, { status: 201 });
}
