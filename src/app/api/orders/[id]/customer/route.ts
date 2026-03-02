import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: orderId } = await params;
  const { customerId } = await request.json();

  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { customerId },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json({ data: order });
}
