"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  seatNumber: number | null;
  status: string;
  menuItem: { name: string; nameEs: string; destination: string };
  modifiers: { modifier: { name: string; nameEs: string }; priceAdj: number }[];
}

interface OrderData {
  id: string;
  status: string;
  createdAt: string;
  table: { number: number; name: string | null };
  items: OrderItem[];
  payment: { method: string; subtotal: number; tax: number; total: number; tip: number } | null;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  SUBMITTED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function MyOrdersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });

  const getName = (item: { name: string; nameEs: string }) =>
    locale === "es" ? item.nameEs : item.name;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user session
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) return;
      const { data: session } = await sessionRes.json();

      const from = `${selectedDate}T00:00:00`;
      const to = `${selectedDate}T23:59:59`;
      const res = await fetch(
        `/api/orders?serverId=${session.userId}&from=${from}&to=${to}`
      );
      if (!res.ok) return;
      const { data } = await res.json();
      setOrders(data as OrderData[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusLabel = (status: string) => {
    const key = status.toLowerCase() as "open" | "submitted" | "completed" | "closed" | "cancelled";
    return t(`orders.${key}`);
  };

  const getOrderTotal = (order: OrderData) => {
    if (order.payment) return Number(order.payment.total);
    return order.items
      .filter((i) => i.status !== "CANCELLED")
      .reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(locale === "es" ? "es-MX" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const activeItemCount = (order: OrderData) =>
    order.items.filter((i) => i.status !== "CANCELLED").length;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {t("orders.myOrders")}
        </h2>
      </div>

      {/* Date picker */}
      <div className="mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-11 px-4 border border-gray-300 rounded-xl text-gray-700 bg-white touch-manipulation w-full sm:w-auto"
        />
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-gray-400">{t("common.loading")}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <p className="text-gray-400 text-lg">{t("orders.noOrdersFound")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const total = getOrderTotal(order);
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Order header — tap to expand */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full p-4 flex items-center justify-between touch-manipulation"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-800">
                      #{order.table.number}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">
                        ${total.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTime(order.createdAt)} · {activeItemCount(order)} {t("orders.itemCount")}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4">
                    <div className="space-y-2 mt-3">
                      {order.items.map((item) => {
                        const isCancelled = item.status === "CANCELLED";
                        return (
                          <div
                            key={item.id}
                            className={`flex items-start justify-between gap-2 ${isCancelled ? "opacity-50" : ""}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${isCancelled ? "line-through text-gray-400" : "text-gray-800"}`}>
                                <span className="font-bold">{item.quantity}x</span>{" "}
                                {item.seatNumber != null && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mr-1 font-medium">
                                    S{item.seatNumber}
                                  </span>
                                )}
                                {getName(item.menuItem)}
                              </p>
                              {item.modifiers.length > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {item.modifiers.map((m) => getName(m.modifier)).join(", ")}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-yellow-600 italic mt-0.5">{item.notes}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-medium ${isCancelled ? "line-through text-gray-400" : "text-gray-700"}`}>
                                ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                              </p>
                              <p className={`text-xs mt-0.5 ${
                                item.status === "READY" ? "text-green-600" :
                                item.status === "SERVED" ? "text-blue-600" :
                                isCancelled ? "text-red-500" :
                                "text-gray-400"
                              }`}>
                                {getStatusLabel(item.status)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Payment info if exists */}
                    {order.payment && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>{t("billing.subtotal")}</span>
                          <span>${Number(order.payment.subtotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t("billing.tax")}</span>
                          <span>${Number(order.payment.tax).toFixed(2)}</span>
                        </div>
                        {Number(order.payment.tip) > 0 && (
                          <div className="flex justify-between">
                            <span>{t("billing.tip")}</span>
                            <span>${Number(order.payment.tip).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-gray-800 mt-1">
                          <span>{t("billing.total")}</span>
                          <span>${Number(order.payment.total).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {order.payment.method === "CASH" ? t("billing.payWithCash") : t("billing.payWithCard")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
