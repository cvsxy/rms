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
        <h1 className="text-xl font-semibold text-gray-900 mb-6">{t("operations.title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
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
    },
    {
      label: t("operations.kitchenQueue"),
      value: data.kitchenQueue,
    },
    {
      label: t("operations.barQueue"),
      value: data.barQueue,
    },
    {
      label: t("operations.avgPrepTime"),
      value: `${data.avgPrepTimeMinutes} ${t("operations.minutes")}`,
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
        <h1 className="text-xl font-semibold text-gray-900">{t("operations.title")}</h1>
        {lastUpdated && (
          <span className="text-xs text-gray-400">
            {t("operations.lastUpdated", {
              time: lastUpdated.toLocaleTimeString(),
            })}
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg p-6 border border-gray-200">
            <span className="text-sm text-gray-500">{card.label}</span>
            <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by status */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
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
                        className="bg-gray-900 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data.items86d > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
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
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {t("operations.serverWorkload")}
          </h2>
          {data.servers.length === 0 ? (
            <p className="text-gray-400 text-sm">{t("operations.noActiveOrders")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("operations.server")}
                    </th>
                    <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("operations.tablesAssigned")}
                    </th>
                    <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("operations.activeItems")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.servers.map((server) => (
                    <tr key={server.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-medium text-gray-900">{server.name}</td>
                      <td className="py-3 text-center">
                        <span className="text-sm font-medium text-gray-700">
                          {server.tables}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-sm font-medium text-gray-700">
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
