"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface DailySummary {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  cashTotal: number;
  cardTotal: number;
  itemsSold: number;
}

interface ServerStat {
  id: string;
  name: string;
  orderCount: number;
  revenue: number;
}

export default function ReportsPage() {
  const t = useTranslations();
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [serverStats, setServerStats] = useState<ServerStat[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchReports() {
    setLoading(true);

    // Fetch all orders for selected date with payments
    const startDate = new Date(date + "T00:00:00");
    const endDate = new Date(date + "T23:59:59");

    const [ordersRes, serversRes] = await Promise.all([
      fetch(
        `/api/orders?from=${startDate.toISOString()}&to=${endDate.toISOString()}`
      ),
      fetch("/api/servers"),
    ]);

    if (ordersRes.ok && serversRes.ok) {
      const ordersJson = await ordersRes.json();
      const serversJson = await serversRes.json();
      const orders = ordersJson.data || ordersJson;
      const servers = serversJson.data || serversJson;

      // Calculate summary
      let totalRevenue = 0;
      let cashTotal = 0;
      let cardTotal = 0;
      let itemsSold = 0;
      const serverMap: Record<
        string,
        { name: string; orderCount: number; revenue: number }
      > = {};

      // Initialize server stats
      for (const s of servers) {
        serverMap[s.id] = { name: s.name, orderCount: 0, revenue: 0 };
      }

      for (const order of orders) {
        // Count items
        if (order.items) {
          itemsSold += order.items.length;
        }

        // Payment data
        if (order.payment) {
          const payTotal = Number(order.payment.total);
          totalRevenue += payTotal;

          if (order.payment.method === "CASH") cashTotal += payTotal;
          else cardTotal += payTotal;

          // Server stats
          if (serverMap[order.serverId]) {
            serverMap[order.serverId].orderCount++;
            serverMap[order.serverId].revenue += payTotal;
          }
        }
      }

      setSummary({
        totalRevenue,
        orderCount: orders.length,
        avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        cashTotal,
        cardTotal,
        itemsSold,
      });

      setServerStats(
        Object.entries(serverMap)
          .map(([id, data]) => ({ id, ...data }))
          .filter((s) => s.orderCount > 0)
          .sort((a, b) => b.revenue - a.revenue)
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchReports();
  }, [date]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("reports.title")}
        </h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">
            {t("reports.filterByDate")}:
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{t("common.loading")}</p>
        </div>
      ) : summary ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">
                {t("reports.totalRevenue")}
              </p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                ${summary.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">
                {t("reports.orderCount")}
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {summary.orderCount}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">
                {t("reports.avgOrderValue")}
              </p>
              <p className="text-3xl font-bold text-indigo-600 mt-1">
                ${summary.avgOrderValue.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">{t("reports.cash")}</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                ${summary.cashTotal.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">{t("reports.card")}</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                ${summary.cardTotal.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">
                {t("reports.itemsSold")}
              </p>
              <p className="text-3xl font-bold text-pink-600 mt-1">
                {summary.itemsSold}
              </p>
            </div>
          </div>

          {/* Server breakdown */}
          {serverStats.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("reports.filterByServer")}
              </h2>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t("admin.serverName")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      {t("reports.orderCount")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      {t("reports.totalRevenue")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {serverStats.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">
                        {s.orderCount}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        ${s.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          {t("common.noResults")}
        </div>
      )}
    </div>
  );
}
