import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import DashboardCharts from "./DashboardCharts";

export const dynamic = "force-dynamic";

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
    OPEN: "bg-blue-100 text-blue-800",
    SUBMITTED: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CLOSED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    OPEN: t("orders.open"),
    SUBMITTED: t("orders.submitted"),
    COMPLETED: t("orders.completed"),
    CLOSED: t("orders.closed"),
    CANCELLED: t("orders.cancelled"),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t("admin.dashboard")}
      </h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Today's Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t("reports.totalRevenue")}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                ${todayRevenue.toFixed(2)}
              </p>
              <TrendBadge value={revenueTrend} />
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Orders Today */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t("reports.orderCount")}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {todayOrderCount}
              </p>
              <TrendBadge value={ordersTrend} />
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </div>
        </div>

        {/* Avg Order Value */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t("reports.avgOrderValue")}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                ${avgOrderValue.toFixed(2)}
              </p>
              <TrendBadge value={avgTrend} />
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Open Tables */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t("admin.openTables")}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {activeTables}
              </p>
              <span className="text-xs font-medium text-gray-400">
                {openOrders} {t("orders.open").toLowerCase()}
              </span>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts
        revenueByDay={revenueByDay}
        ordersByHour={ordersByHour}
        topItems={topItemsData}
      />

      {/* Bottom Section: Recent Orders + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {t("admin.recentOrders")}
          </h2>
          {recentOrdersData.length > 0 ? (
            <div className="space-y-3">
              {recentOrdersData.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {order.tableNumber}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t("tables.tableNumber", { number: order.tableNumber })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.serverName} &middot; {order.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    {order.total !== null && (
                      <span className="text-sm font-semibold text-gray-900">
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

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {t("admin.quickActions")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="menu"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">{t("admin.manageMenu")}</span>
            </a>

            <a
              href="reports"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">{t("admin.reports")}</span>
            </a>

            <a
              href="inventory"
              className="relative flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {lowStockCount > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {lowStockCount}
                </span>
              )}
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">{t("admin.inventory")}</span>
              {lowStockCount > 0 && (
                <span className="text-xs text-red-500 font-medium">
                  {t("admin.itemsLowStock", { count: lowStockCount })}
                </span>
              )}
            </a>

            <a
              href="tables"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">{t("admin.manageTables")}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
