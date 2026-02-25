import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const t = await getTranslations();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl p-6 ${stat.color}`}
          >
            <p className="text-sm font-medium opacity-75">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
