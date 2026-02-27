import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.restaurantSetting.findMany();
  const data = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const { key, value } = await request.json();
  if (!key) {
    return NextResponse.json({ error: "Key is required" }, { status: 400 });
  }
  const setting = await prisma.restaurantSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
  return NextResponse.json({ data: setting });
}
