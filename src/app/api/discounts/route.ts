import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

  const { name, nameEs, type, value, code } = await request.json();

  if (!name || !nameEs || !type || value == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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
