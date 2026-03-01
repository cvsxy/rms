import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (fromParam && toParam) {
    where.date = {
      gte: new Date(fromParam),
      lte: new Date(toParam),
    };
  }

  const closes = await prisma.dailyClose.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      closedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({
    data: closes.map((c) => ({
      id: c.id,
      date: c.date.toISOString().split("T")[0],
      expectedCash: Number(c.expectedCash),
      actualCash: Number(c.actualCash),
      variance: Number(c.variance),
      cardTotal: Number(c.cardTotal),
      totalRevenue: Number(c.totalRevenue),
      totalTax: Number(c.totalTax),
      totalTips: Number(c.totalTips),
      totalDiscount: Number(c.totalDiscount),
      subtotal: Number(c.subtotal),
      orderCount: c.orderCount,
      closedByName: c.closedBy.name,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, actualCash, notes } = await request.json();

  if (!date || actualCash === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: date, actualCash" },
      { status: 400 }
    );
  }

  const closeDate = new Date(date + "T00:00:00");
  const dayStart = new Date(date + "T00:00:00");
  const dayEnd = new Date(date + "T23:59:59");

  // Check if day already closed
  const existing = await prisma.dailyClose.findUnique({
    where: { date: closeDate },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This day has already been closed" },
      { status: 409 }
    );
  }

  // Aggregate payments for the day
  const payments = await prisma.payment.findMany({
    where: {
      createdAt: { gte: dayStart, lte: dayEnd },
    },
  });

  let expectedCash = 0;
  let cardTotal = 0;
  let totalRevenue = 0;
  let totalTax = 0;
  let totalTips = 0;
  let totalDiscount = 0;
  let subtotal = 0;

  for (const p of payments) {
    const tot = Number(p.total);
    totalRevenue += tot;
    totalTax += Number(p.tax);
    totalTips += Number(p.tip);
    totalDiscount += Number(p.discount);
    subtotal += Number(p.subtotal);

    if (p.method === "CASH") {
      // Expected cash = total + tips for cash payments
      expectedCash += tot + Number(p.tip);
    } else {
      cardTotal += tot + Number(p.tip);
    }
  }

  const variance = Number(actualCash) - expectedCash;

  const dailyClose = await prisma.dailyClose.create({
    data: {
      date: closeDate,
      expectedCash: round2(expectedCash),
      actualCash: Number(actualCash),
      variance: round2(variance),
      cardTotal: round2(cardTotal),
      totalRevenue: round2(totalRevenue),
      totalTax: round2(totalTax),
      totalTips: round2(totalTips),
      totalDiscount: round2(totalDiscount),
      subtotal: round2(subtotal),
      orderCount: payments.length,
      closedById: session.userId,
      notes: notes || null,
    },
    include: {
      closedBy: { select: { name: true } },
    },
  });

  // Audit log
  await createAuditLog({
    action: "DAILY_CLOSED",
    userId: session.userId,
    details: {
      date,
      expectedCash: round2(expectedCash),
      actualCash: Number(actualCash),
      variance: round2(variance),
      orderCount: payments.length,
      totalRevenue: round2(totalRevenue),
    },
  });

  return NextResponse.json(
    {
      data: {
        id: dailyClose.id,
        date: dailyClose.date.toISOString().split("T")[0],
        expectedCash: Number(dailyClose.expectedCash),
        actualCash: Number(dailyClose.actualCash),
        variance: Number(dailyClose.variance),
        cardTotal: Number(dailyClose.cardTotal),
        totalRevenue: Number(dailyClose.totalRevenue),
        totalTax: Number(dailyClose.totalTax),
        totalTips: Number(dailyClose.totalTips),
        totalDiscount: Number(dailyClose.totalDiscount),
        subtotal: Number(dailyClose.subtotal),
        orderCount: dailyClose.orderCount,
        closedByName: dailyClose.closedBy.name,
        notes: dailyClose.notes,
        createdAt: dailyClose.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
