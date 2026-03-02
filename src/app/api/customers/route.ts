import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

const createCustomerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
  dietaryNotes: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const tag = searchParams.get("tag") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;

  const where: Record<string, unknown> = { active: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (tag) {
    where.tags = { has: tag };
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { lastVisit: { sort: "desc", nulls: "last" } },
      skip: (page - 1) * limit,
      take: limit,
      include: { loyaltyMember: { select: { pointsBalance: true, tier: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ data: customers, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, phone, email, notes, dietaryNotes, tags } = parsed.data;

  // Check for existing customer with same phone
  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: "Customer with this phone already exists", data: existing }, { status: 409 });
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      phone,
      email: email || null,
      notes: notes || null,
      dietaryNotes: dietaryNotes || null,
      tags: tags || [],
    },
  });

  return NextResponse.json({ data: customer }, { status: 201 });
}
