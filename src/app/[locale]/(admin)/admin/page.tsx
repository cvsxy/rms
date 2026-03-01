import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import DashboardCharts from "./DashboardCharts";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "admin.greetingMorning";
  if (h < 18) return "admin.greetingAfternoon";
  return "admin.greetingEvening";
}

export default async function AdminDashboard() {
  const t = await getTranslations();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Parallel data fetching
  const [
    todayPayments,
    yesterdayPayments,
    todayOrderCount,
    yesterdayOrderCount,
    openOrders,
    activeTables,
    allIngredients,
    recentPayments7d,
    todayOrdersList,
    topItemsRaw,
    recentOrders,
    todayTips,
    todayDailyClose,
    kitchenQueue,
    barQueue,
    serverRevenues,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { total: true },
    }),
    prisma.payment.findMany({
      where: { createdAt: { gte: yesterday, lt: today } },
      select: { total: true },
    }),
    prisma.order.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.order.count({
      where: { createdAt: { gte: yesterday, lt: today } },
    }),
    prisma.order.count({
      where: { status: { in: ["OPEN", "SUBMITTED", "COMPLETED"] } },
    }),
    prisma.restaurantTable.count({
      where: { status: "OCCUPIED", active: true },
    }),
    prisma.ingredient.findMany({
      where: { active: true },
      select: { currentStock: true, lowStockThreshold: true },
    }),
    prisma.payment.findMany({
      where: { createdAt: { gte: (() => { const d = new Date(today); d.setDate(d.getDate() - 6); return d; })() } },
      select: { total: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { createdAt: true },
    }),
    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        table: true,
        server: { select: { id: true, name: true } },
        payment: { select: { total: true } },
      },
    }),
    prisma.payment.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { tip: true },
    }),
    prisma.dailyClose.findFirst({
      where: { date: today },
    }),
    prisma.orderItem.count({
      where: {
        status: { in: ["PREPARING", "SENT"] },
        menuItem: { destination: "KITCHEN" },
      },
    }),
    prisma.orderItem.count({
      where: {
        status: { in: ["PREPARING", "SENT"] },
        menuItem: { destination: "BAR" },
      },
    }),
    // Server leaderboard: today's revenue by server
    prisma.payment.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: {
        total: true,
        order: { select: { serverId: true, server: { select: { name: true } } } },
      },
    }),
  ]);

  // Revenue calculations
  const todayRevenue = todayPayments.reduce((sum, p) => sum + Number(p.total), 0);
  const yesterdayRevenue = yesterdayPayments.reduce((sum, p) => sum + Number(p.total), 0);

  // Trend calculations
  const revenueTrend = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : 0;
  const ordersTrend = yesterdayOrderCount > 0
    ? Math.round(((todayOrderCount - yesterdayOrderCount) / yesterdayOrderCount) * 100)
    : 0;

  // Average order value
  const avgOrderValue = todayOrderCount > 0
    ? Math.round((todayRevenue / todayOrderCount) * 100) / 100
    : 0;
  const yesterdayAvg = yesterdayOrderCount > 0
    ? yesterdayRevenue / yesterdayOrderCount
    : 0;
  const avgTrend = yesterdayAvg > 0
    ? Math.round(((avgOrderValue - yesterdayAvg) / yesterdayAvg) * 100)
    : 0;

  // Tips total
  const tipsTotal = todayTips.reduce((sum, p) => sum + Number(p.tip), 0);

  // Low stock count
  const lowStockCount = allIngredients.filter(
    (i) => Number(i.currentStock) <= Number(i.lowStockThreshold)
  ).length;

  // 7-day revenue chart data
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const revenueByDay: { date: string; revenue: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayTotal = recentPayments7d
      .filter((p) => p.createdAt.toISOString().split("T")[0] === dateStr)
      .reduce((sum, p) => sum + Number(p.total), 0);
    revenueByDay.push({
      date: d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" }),
      revenue: Math.round(dayTotal * 100) / 100,
    });
  }

  // Orders by hour chart data
  const ordersByHour: { hour: string; orders: number }[] = [];
  for (let h = 8; h <= 23; h++) {
    const count = todayOrdersList.filter(
      (o) => o.createdAt.getHours() === h
    ).length;
    ordersByHour.push({
      hour: `${h}:00`,
      orders: count,
    });
  }

  // Top 5 items chart data
  const menuItemIds = topItemsRaw.map((t) => t.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: { id: true, name: true, nameEs: true },
  });

  const topItemsData = topItemsRaw.map((item) => {
    const mi = menuItems.find((m) => m.id === item.menuItemId);
    return {
      name: mi?.nameEs || mi?.name || "?",
      quantity: item._sum.quantity || 0,
    };
  });

  // Format recent orders for display
  const recentOrdersData = recentOrders.map((order) => ({
    id: order.id,
    tableNumber: order.table.number,
    serverName: order.server.name,
    time: order.createdAt.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: order.status,
    total: order.payment ? Number(order.payment.total) : null,
  }));

  // Server leaderboard
  const serverMap = new Map<string, { name: string; revenue: number; orders: number }>();
  for (const p of serverRevenues) {
    const sid = p.order.serverId;
    const existing = serverMap.get(sid);
    if (existing) {
      existing.revenue += Number(p.total);
      existing.orders += 1;
    } else {
      serverMap.set(sid, { name: p.order.server.name, revenue: Number(p.total), orders: 1 });
    }
  }
  const leaderboard = Array.from(serverMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Daily close status
  const isDayClosed = !!todayDailyClose;

  function TrendBadge({ value }: { value: number }) {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-500"}`}>
        {isPositive ? "\u2191" : "\u2193"} {Math.abs(value)}%
      </span>
    );
  }

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-700",
    SUBMITTED: "bg-amber-50 text-amber-700",
    COMPLETED: "bg-green-50 text-green-700",
    CLOSED: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-50 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    OPEN: t("orders.open"),
    SUBMITTED: t("orders.submitted"),
    COMPLETED: t("orders.completed"),
    CLOSED: t("orders.closed"),
    CANCELLED: t("orders.cancelled"),
  };

  const dateStr = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      {/* Header with greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {t(getGreetingKey())}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{dateStr}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <div className="admin-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("reports.totalRevenue")}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            ${todayRevenue.toFixed(2)}
          </p>
          <TrendBadge value={revenueTrend} />
        </div>

        <div className="admin-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("reports.orderCount")}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {todayOrderCount}
          </p>
          <TrendBadge value={ordersTrend} />
        </div>

        <div className="admin-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("reports.avgOrderValue")}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            ${avgOrderValue.toFixed(2)}
          </p>
          <TrendBadge value={avgTrend} />
        </div>

        <div className="admin-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.tipsToday")}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            ${tipsTotal.toFixed(2)}
          </p>
        </div>

        <div className="admin-card p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t("admin.openTables")}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {activeTables}
          </p>
          <span className="text-xs text-gray-400">
            {openOrders} {t("orders.open").toLowerCase()}
          </span>
        </div>
      </div>

      {/* Daily Close Reminder + Kitchen/Bar Status */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Daily Close Reminder */}
        {isDayClosed ? (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-700 font-medium">{t("admin.dailyClosed")}</span>
          </div>
        ) : (
          <Link
            href="admin/reports"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm hover:bg-amber-100 transition-colors"
          >
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-amber-700 font-medium">{t("admin.dailyCloseReminder")}</span>
          </Link>
        )}

        {/* Kitchen / Bar Status */}
        <div className="admin-card px-4 py-2.5 flex items-center gap-5 text-sm flex-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            <span className="text-gray-500">{t("admin.kitchenQueue")}</span>
            <span className="font-semibold text-gray-900">{kitchenQueue}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span className="text-gray-500">{t("admin.barQueue")}</span>
            <span className="font-semibold text-gray-900">{barQueue}</span>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="text-gray-500">{t("admin.inventory")}</span>
              <span className="font-semibold text-red-600">{lowStockCount} low</span>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts
        revenueByDay={revenueByDay}
        ordersByHour={ordersByHour}
        topItems={topItemsData}
      />

      {/* Bottom Section: Recent Orders + Server Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Recent Orders */}
        <div className="admin-card p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
            {t("admin.recentOrders")}
          </h2>
          {recentOrdersData.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentOrdersData.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 w-6 text-center">
                      {order.tableNumber}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t("tables.tableNumber", { number: order.tableNumber })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.serverName} &middot; {order.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    {order.total !== null && (
                      <span className="text-sm font-medium text-gray-900 tabular-nums">
                        ${order.total.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              {t("orders.noOrdersFound")}
            </p>
          )}
        </div>

        {/* Server Leaderboard */}
        <div className="admin-card p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
            {t("admin.serverLeaderboard")}
          </h2>
          {leaderboard.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {leaderboard.map((server, i) => (
                <div key={server.name} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-300 w-5 text-center">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{server.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {server.orders} {t("reports.orderCount").toLowerCase()}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      ${server.revenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              {t("reports.noDataForPeriod")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
