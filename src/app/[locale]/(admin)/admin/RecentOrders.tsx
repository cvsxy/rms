"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";

interface OrderData {
  id: string;
  status: string;
  createdAt: string;
  table: { number: number };
  server: { id: string; name: string };
  payment: { total: string | number } | null;
}

function formatRelativeTime(dateStr: string, locale: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);

  if (diffMin < 1) {
    return locale === "es" ? "ahora" : "just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m ${locale === "es" ? "atrás" : "ago"}`;
  }
  if (diffHr < 24) {
    return `${diffHr}h ${locale === "es" ? "atrás" : "ago"}`;
  }

  return date.toLocaleTimeString(locale === "es" ? "es-MX" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function RecentOrders() {
  const t = useTranslations();
  const locale = useLocale();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders?limit=8");
        if (res.ok) {
          const json = await res.json();
          const data: OrderData[] = json.data || [];
          setOrders(data.slice(0, 8));
        }
      } catch {
        // Silently fail — dashboard will show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const statusLabels: Record<string, string> = {
    OPEN: t("orders.open"),
    SUBMITTED: t("orders.submitted"),
    COMPLETED: t("orders.completed"),
    CLOSED: t("orders.closed"),
    CANCELLED: t("orders.cancelled"),
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          {t("admin.recentOrders")}
        </h2>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-200 animate-pulse" />
                <div className="space-y-1">
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="w-28 h-3 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        {t("admin.recentOrders")}
      </h2>
      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                  {order.table.number}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t("tables.tableNumber", { number: order.table.number })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.server.name} &middot; {formatRelativeTime(order.createdAt, locale)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    statusColors[order.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {statusLabels[order.status] || order.status}
                </span>
                {order.payment && (
                  <span className="text-sm font-semibold text-gray-900">
                    ${Number(order.payment.total).toFixed(2)}
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
  );
}
