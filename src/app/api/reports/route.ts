import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const serverId = searchParams.get("serverId");

  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "Missing required 'from' and 'to' query parameters" },
      { status: 400 }
    );
  }

  const from = new Date(fromParam);
  const to = new Date(toParam);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use ISO date strings." },
      { status: 400 }
    );
  }

  // Build filter for orders in date range with optional server filter
  const where: Record<string, unknown> = {
    createdAt: { gte: from, lte: to },
  };
  if (serverId) {
    where.serverId = serverId;
  }

  // Fetch all orders in range with related data (including ingredient costs)
  const orders = await prisma.order.findMany({
    where,
    include: {
      server: { select: { id: true, name: true } },
      items: {
        include: {
          menuItem: {
            include: {
              category: { select: { id: true, name: true, nameEs: true } },
              ingredients: {
                include: {
                  ingredient: { select: { costPerUnit: true } },
                },
              },
            },
          },
        },
      },
      payment: true,
    },
  });

  // Only orders with a payment count toward revenue
  const paidOrders = orders.filter((o) => o.payment !== null);

  // ── Summary ────────────────────────────────────────────────────
  let totalRevenue = 0;
  let cashTotal = 0;
  let cardTotal = 0;
  let tipTotal = 0;
  let itemsSold = 0;

  for (const order of paidOrders) {
    const payment = order.payment!;
    const total = Number(payment.total);
    totalRevenue += total;
    tipTotal += Number(payment.tip);

    if (payment.method === "CASH") {
      cashTotal += total;
    } else {
      cardTotal += total;
    }

    for (const item of order.items) {
      if (item.status !== "CANCELLED") {
        itemsSold += item.quantity;
      }
    }
  }

  const orderCount = paidOrders.length;
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  const summary = {
    totalRevenue: round2(totalRevenue),
    orderCount,
    avgOrderValue: round2(avgOrderValue),
    cashTotal: round2(cashTotal),
    cardTotal: round2(cardTotal),
    itemsSold,
    tipTotal: round2(tipTotal),
  };

  // ── Revenue By Day ─────────────────────────────────────────────
  const revenueByDayMap = new Map<string, { revenue: number; orders: number }>();

  // Pre-fill all days in range so chart shows zeros for empty days
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const endDate = new Date(to);
  endDate.setHours(0, 0, 0, 0);
  while (cursor <= endDate) {
    const key = cursor.toISOString().split("T")[0];
    revenueByDayMap.set(key, { revenue: 0, orders: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const order of paidOrders) {
    const dayKey = order.createdAt.toISOString().split("T")[0];
    const existing = revenueByDayMap.get(dayKey) ?? { revenue: 0, orders: 0 };
    existing.revenue += Number(order.payment!.total);
    existing.orders += 1;
    revenueByDayMap.set(dayKey, existing);
  }

  const revenueByDay = Array.from(revenueByDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      revenue: round2(vals.revenue),
      orders: vals.orders,
    }));

  // ── Orders By Hour ─────────────────────────────────────────────
  const hourMap = new Map<number, { orders: number; revenue: number }>();
  for (let h = 0; h < 24; h++) {
    hourMap.set(h, { orders: 0, revenue: 0 });
  }

  for (const order of paidOrders) {
    const hour = order.createdAt.getHours();
    const existing = hourMap.get(hour)!;
    existing.orders += 1;
    existing.revenue += Number(order.payment!.total);
    hourMap.set(hour, existing);
  }

  const ordersByHour = Array.from(hourMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, vals]) => ({
      hour,
      orders: vals.orders,
      revenue: round2(vals.revenue),
    }));

  // ── Top Items ──────────────────────────────────────────────────
  const itemMap = new Map<
    string,
    { name: string; nameEs: string; quantity: number; revenue: number; cost: number }
  >();

  for (const order of paidOrders) {
    for (const item of order.items) {
      if (item.status === "CANCELLED") continue;

      const menuItemId = item.menuItemId;
      const existing = itemMap.get(menuItemId) ?? {
        name: item.menuItem.name,
        nameEs: item.menuItem.nameEs,
        quantity: 0,
        revenue: 0,
        cost: 0,
      };

      const itemRevenue = Number(item.unitPrice) * item.quantity;
      const itemCost = computeItemCost(item.menuItem.ingredients) * item.quantity;

      existing.quantity += item.quantity;
      existing.revenue += itemRevenue;
      existing.cost += itemCost;
      itemMap.set(menuItemId, existing);
    }
  }

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
    .map((item) => ({
      name: item.name,
      nameEs: item.nameEs,
      quantity: item.quantity,
      revenue: round2(item.revenue),
    }));

  // ── Category Breakdown ─────────────────────────────────────────
  const categoryMap = new Map<
    string,
    { name: string; nameEs: string; revenue: number; itemCount: number; cost: number }
  >();

  for (const order of paidOrders) {
    for (const item of order.items) {
      if (item.status === "CANCELLED") continue;

      const cat = item.menuItem.category;
      const existing = categoryMap.get(cat.id) ?? {
        name: cat.name,
        nameEs: cat.nameEs,
        revenue: 0,
        itemCount: 0,
        cost: 0,
      };

      const itemRevenue = Number(item.unitPrice) * item.quantity;
      const itemCost = computeItemCost(item.menuItem.ingredients) * item.quantity;

      existing.revenue += itemRevenue;
      existing.itemCount += item.quantity;
      existing.cost += itemCost;
      categoryMap.set(cat.id, existing);
    }
  }

  const categoryBreakdown = Array.from(categoryMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((cat) => ({
      name: cat.name,
      nameEs: cat.nameEs,
      revenue: round2(cat.revenue),
      itemCount: cat.itemCount,
    }));

  // ── Server Performance (with tips) ─────────────────────────────
  const serverMap = new Map<
    string,
    {
      id: string;
      name: string;
      orders: number;
      revenue: number;
      totalItems: number;
      tips: number;
    }
  >();

  for (const order of paidOrders) {
    const sid = order.serverId;
    const existing = serverMap.get(sid) ?? {
      id: sid,
      name: order.server.name,
      orders: 0,
      revenue: 0,
      totalItems: 0,
      tips: 0,
    };
    existing.orders += 1;
    existing.revenue += Number(order.payment!.total);
    existing.tips += Number(order.payment!.tip);

    for (const item of order.items) {
      if (item.status !== "CANCELLED") {
        existing.totalItems += item.quantity;
      }
    }

    serverMap.set(sid, existing);
  }

  const serverPerformance = Array.from(serverMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((s) => ({
      id: s.id,
      name: s.name,
      orders: s.orders,
      revenue: round2(s.revenue),
      avgOrder: round2(s.orders > 0 ? s.revenue / s.orders : 0),
      itemsPerOrder: round1(s.orders > 0 ? s.totalItems / s.orders : 0),
      tips: round2(s.tips),
    }));

  // ── Payment Methods ────────────────────────────────────────────
  const paymentMap = new Map<string, { count: number; total: number }>();

  for (const order of paidOrders) {
    const method = order.payment!.method;
    const existing = paymentMap.get(method) ?? { count: 0, total: 0 };
    existing.count += 1;
    existing.total += Number(order.payment!.total);
    paymentMap.set(method, existing);
  }

  const paymentMethods = Array.from(paymentMap.entries())
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([method, vals]) => ({
      method,
      count: vals.count,
      total: round2(vals.total),
    }));

  // ── Tax Breakdown (daily + monthly) ────────────────────────────
  const taxDayMap = new Map<
    string,
    { subtotal: number; tax: number; discount: number; tips: number; total: number; orderCount: number }
  >();

  // Pre-fill days
  const taxCursor = new Date(from);
  taxCursor.setHours(0, 0, 0, 0);
  while (taxCursor <= endDate) {
    const key = taxCursor.toISOString().split("T")[0];
    taxDayMap.set(key, { subtotal: 0, tax: 0, discount: 0, tips: 0, total: 0, orderCount: 0 });
    taxCursor.setDate(taxCursor.getDate() + 1);
  }

  let monthlySubtotal = 0;
  let monthlyTax = 0;
  let monthlyDiscount = 0;
  let monthlyTips = 0;
  let monthlyTotal = 0;

  for (const order of paidOrders) {
    const payment = order.payment!;
    const dayKey = order.createdAt.toISOString().split("T")[0];
    const existing = taxDayMap.get(dayKey) ?? {
      subtotal: 0, tax: 0, discount: 0, tips: 0, total: 0, orderCount: 0,
    };

    const sub = Number(payment.subtotal);
    const tax = Number(payment.tax);
    const disc = Number(payment.discount);
    const tip = Number(payment.tip);
    const tot = Number(payment.total);

    existing.subtotal += sub;
    existing.tax += tax;
    existing.discount += disc;
    existing.tips += tip;
    existing.total += tot;
    existing.orderCount += 1;
    taxDayMap.set(dayKey, existing);

    monthlySubtotal += sub;
    monthlyTax += tax;
    monthlyDiscount += disc;
    monthlyTips += tip;
    monthlyTotal += tot;
  }

  const taxBreakdown = {
    daily: Array.from(taxDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        subtotal: round2(vals.subtotal),
        tax: round2(vals.tax),
        discount: round2(vals.discount),
        tips: round2(vals.tips),
        total: round2(vals.total),
        orderCount: vals.orderCount,
      })),
    monthly: {
      subtotal: round2(monthlySubtotal),
      tax: round2(monthlyTax),
      discount: round2(monthlyDiscount),
      tips: round2(monthlyTips),
      total: round2(monthlyTotal),
      orderCount,
    },
  };

  // ── Cost Analysis (P&L) ────────────────────────────────────────
  let totalFoodCost = 0;
  let totalItemRevenue = 0;

  // Re-use itemMap for per-item cost data
  const allItemsForCost = Array.from(itemMap.values());
  for (const item of allItemsForCost) {
    totalFoodCost += item.cost;
    totalItemRevenue += item.revenue;
  }

  const grossProfit = totalItemRevenue - totalFoodCost;
  const foodCostPercent = totalItemRevenue > 0 ? (totalFoodCost / totalItemRevenue) * 100 : 0;

  // Category margins
  const categoryMargins = Array.from(categoryMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((cat) => {
      const profit = cat.revenue - cat.cost;
      const marginPercent = cat.revenue > 0 ? (profit / cat.revenue) * 100 : 0;
      return {
        name: cat.name,
        nameEs: cat.nameEs,
        revenue: round2(cat.revenue),
        cost: round2(cat.cost),
        profit: round2(profit),
        marginPercent: round1(marginPercent),
      };
    });

  // Top items by profit
  const topItemsByProfit = Array.from(itemMap.values())
    .map((item) => {
      const profit = item.revenue - item.cost;
      const marginPercent = item.revenue > 0 ? (profit / item.revenue) * 100 : 0;
      return {
        name: item.name,
        nameEs: item.nameEs,
        revenue: round2(item.revenue),
        cost: round2(item.cost),
        profit: round2(profit),
        marginPercent: round1(marginPercent),
        quantitySold: item.quantity,
      };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  const costAnalysis = {
    totalFoodCost: round2(totalFoodCost),
    totalItemRevenue: round2(totalItemRevenue),
    grossProfit: round2(grossProfit),
    foodCostPercent: round1(foodCostPercent),
    categoryMargins,
    topItemsByProfit,
  };

  // ── Response ───────────────────────────────────────────────────
  return NextResponse.json({
    data: {
      summary,
      revenueByDay,
      ordersByHour,
      topItems,
      categoryBreakdown,
      serverPerformance,
      paymentMethods,
      taxBreakdown,
      costAnalysis,
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Compute the ingredient cost for one serving of a menu item */
function computeItemCost(
  ingredients: { quantity: unknown; ingredient: { costPerUnit: unknown } }[]
): number {
  let cost = 0;
  for (const ing of ingredients) {
    cost += Number(ing.quantity) * Number(ing.ingredient.costPerUnit);
  }
  return cost;
}
