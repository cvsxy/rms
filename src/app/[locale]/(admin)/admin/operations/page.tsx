"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";

interface OperationsData {
  activeOrders: number;
  ordersByStatus: Record<string, number>;
  kitchenQueue: number;
  barQueue: number;
  avgPrepTimeMinutes: number;
  servers: { id: string; name: string; tables: number; activeItems: number }[];
  items86d: number;
}

export default function OperationsPage() {
  const t = useTranslations();
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/operations");
      const json = await res.json();
      setData(json.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch operations data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("operations.title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      label: t("operations.activeOrders"),
      value: data.activeOrders,
      color: "text-blue-600",
      bg: "bg-blue-50",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: t("operations.kitchenQueue"),
      value: data.kitchenQueue,
      color: "text-orange-600",
      bg: "bg-orange-50",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        </svg>
      ),
    },
    {
      label: t("operations.barQueue"),
      value: data.barQueue,
      color: "text-purple-600",
      bg: "bg-purple-50",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      label: t("operations.avgPrepTime"),
      value: `${data.avgPrepTimeMinutes} ${t("operations.minutes")}`,
      color: "text-green-600",
      bg: "bg-green-50",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const statusColors: Record<string, string> = {
    OPEN: "bg-gray-100 text-gray-700",
    SUBMITTED: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-green-100 text-green-700",
  };

  const statusLabels: Record<string, string> = {
    OPEN: t("orders.open"),
    SUBMITTED: t("orders.submitted"),
    COMPLETED: t("orders.completed"),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("operations.title")}</h1>
        {lastUpdated && (
          <span className="text-sm text-gray-400">
            {t("operations.lastUpdated", {
              time: lastUpdated.toLocaleTimeString(),
            })}
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>{card.icon}</div>
              <span className="text-sm text-gray-500">{card.label}</span>
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by status */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("operations.ordersByStatus")}
          </h2>
          {data.activeOrders === 0 ? (
            <p className="text-gray-400 text-sm">{t("operations.noActiveOrders")}</p>
          ) : (
            <div className="space-y-3">
              {["OPEN", "SUBMITTED", "COMPLETED"].map((status) => {
                const count = data.ordersByStatus[status] || 0;
                if (count === 0) return null;
                const pct = Math.round((count / data.activeOrders) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[status]}`}>
                        {statusLabels[status]}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data.items86d > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-medium">
                  {data.items86d} {t("operations.items86d")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Server workload */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("operations.serverWorkload")}
          </h2>
          {data.servers.length === 0 ? (
            <p className="text-gray-400 text-sm">{t("operations.noActiveOrders")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-500 font-medium">
                      {t("operations.server")}
                    </th>
                    <th className="text-center py-2 text-gray-500 font-medium">
                      {t("operations.tablesAssigned")}
                    </th>
                    <th className="text-center py-2 text-gray-500 font-medium">
                      {t("operations.activeItems")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.servers.map((server) => (
                    <tr key={server.id} className="border-b last:border-0">
                      <td className="py-3 font-medium text-gray-900">{server.name}</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-700 rounded-full font-semibold">
                          {server.tables}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-50 text-orange-700 rounded-full font-semibold">
                          {server.activeItems}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
