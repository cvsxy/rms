import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          table: { select: { number: true } },
          payment: { select: { total: true, method: true, tip: true } },
          _count: { select: { items: true } },
        },
      },
      reservations: {
        orderBy: { date: "desc" },
        take: 10,
      },
      loyaltyMember: {
        include: {
          transactions: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ data: customer });
}

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
  dietaryNotes: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) data.email = parsed.data.email || null;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null;
  if (parsed.data.dietaryNotes !== undefined) data.dietaryNotes = parsed.data.dietaryNotes || null;
  if (parsed.data.tags !== undefined) data.tags = parsed.data.tags;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;

  const customer = await prisma.customer.update({ where: { id }, data });
  return NextResponse.json({ data: customer });
}
