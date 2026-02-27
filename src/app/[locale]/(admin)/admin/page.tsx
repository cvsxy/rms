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

  // Base stats
  const [
    totalServers,
    totalTables,
    totalMenuItems,
    todayOrders,
    todayPayments,
    openOrders,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "SERVER", active: true } }),
    prisma.restaurantTable.count({ where: { active: true } }),
    prisma.menuItem.count({ where: { active: true } }),
    prisma.order.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.payment.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { total: true },
    }),
    prisma.order.count({
      where: { status: { in: ["OPEN", "SUBMITTED", "COMPLETED"] } },
    }),
  ]);

  const todayRevenue = todayPayments.reduce(
    (sum, p) => sum + Number(p.total),
    0
  );

  // Chart data: 7-day revenue
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const recentPayments = await prisma.payment.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { total: true, createdAt: true },
  });

  const revenueByDay: { date: string; revenue: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayTotal = recentPayments
      .filter((p) => p.createdAt.toISOString().split("T")[0] === dateStr)
      .reduce((sum, p) => sum + Number(p.total), 0);
    revenueByDay.push({
      date: d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" }),
      revenue: Math.round(dayTotal * 100) / 100,
    });
  }

  // Chart data: orders by hour (today)
  const todayOrdersList = await prisma.order.findMany({
    where: { createdAt: { gte: today, lt: tomorrow } },
    select: { createdAt: true },
  });

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

  // Chart data: top 5 items
  const topItems = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const menuItemIds = topItems.map((t) => t.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: { id: true, name: true, nameEs: true },
  });

  const topItemsData = topItems.map((item) => {
    const mi = menuItems.find((m) => m.id === item.menuItemId);
    return {
      name: mi?.nameEs || mi?.name || "?",
      quantity: item._sum.quantity || 0,
    };
  });

  const stats = [
    {
      label: t("reports.totalRevenue"),
      value: `$${todayRevenue.toFixed(2)}`,
      color: "bg-green-50 text-green-700",
    },
    {
      label: t("reports.orderCount"),
      value: todayOrders.toString(),
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: t("orders.open"),
      value: openOrders.toString(),
      color: "bg-yellow-50 text-yellow-700",
    },
    {
      label: t("admin.manageServers"),
      value: totalServers.toString(),
      color: "bg-purple-50 text-purple-700",
    },
    {
      label: t("admin.manageTables"),
      value: totalTables.toString(),
      color: "bg-indigo-50 text-indigo-700",
    },
    {
      label: t("admin.manageMenu"),
      value: totalMenuItems.toString(),
      color: "bg-pink-50 text-pink-700",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t("admin.dashboard")}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl p-5 ${stat.color}`}
          >
            <p className="text-sm font-medium opacity-75">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <DashboardCharts
        revenueByDay={revenueByDay}
        ordersByHour={ordersByHour}
        topItems={topItemsData}
      />

      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {t("reports.dailySummary")}
        </h2>
        <p className="text-gray-500">
          {new Date().toLocaleDateString("es-MX", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
