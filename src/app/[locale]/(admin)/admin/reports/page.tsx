"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SkeletonStatCards } from "@/components/common/Skeleton";

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

interface OrderForExport {
  id: string;
  createdAt: string;
  table: { number: number };
  server: { name: string };
  payment?: { subtotal: string; tax: string; tip: string; total: string; method: string };
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
  const [rawOrders, setRawOrders] = useState<OrderForExport[]>([]);

  async function fetchReports() {
    setLoading(true);

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

      setRawOrders(orders);

      let totalRevenue = 0;
      let cashTotal = 0;
      let cardTotal = 0;
      let itemsSold = 0;
      const serverMap: Record<
        string,
        { name: string; orderCount: number; revenue: number }
      > = {};

      for (const s of servers) {
        serverMap[s.id] = { name: s.name, orderCount: 0, revenue: 0 };
      }

      for (const order of orders) {
        if (order.items) {
          itemsSold += order.items.length;
        }

        if (order.payment) {
          const payTotal = Number(order.payment.total);
          totalRevenue += payTotal;

          if (order.payment.method === "CASH") cashTotal += payTotal;
          else cardTotal += payTotal;

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

  function exportCSV() {
    const headers = ["Date", "Order #", "Table", "Server", "Subtotal", "IVA", "Tip", "Total", "Method"];
    const rows = rawOrders
      .filter((o) => o.payment)
      .map((o) => [
        new Date(o.createdAt).toLocaleDateString("es-MX"),
        o.id.slice(0, 8),
        o.table.number.toString(),
        o.server.name,
        Number(o.payment!.subtotal).toFixed(2),
        Number(o.payment!.tax).toFixed(2),
        Number(o.payment!.tip).toFixed(2),
        Number(o.payment!.total).toFixed(2),
        o.payment!.method,
      ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rms-report-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
          {!loading && summary && summary.orderCount > 0 && (
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("reports.exportCsv")}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonStatCards />
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
