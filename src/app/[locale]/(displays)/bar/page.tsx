"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePusherChannel } from "@/hooks/usePusher";

interface DisplayItem {
  id: string;
  quantity: number;
  notes: string | null;
  status: string;
  sentAt: string;
  menuItem: { name: string; nameEs: string; destination: string };
  modifiers: { modifier: { name: string; nameEs: string } }[];
}

interface DisplayOrder {
  id: string;
  table: { number: number; name: string | null };
  server: { name: string };
  items: DisplayItem[];
}

export default function BarDisplayPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [, setTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders?status=SUBMITTED");
    if (!res.ok) return;
    const { data } = await res.json();
    const barOrders = (data as DisplayOrder[])
      .map((order) => ({
        ...order,
        items: order.items.filter(
          (i) =>
            i.menuItem?.destination === "BAR" &&
            i.status !== "SERVED" &&
            i.status !== "CANCELLED"
        ),
      }))
      .filter((order) => order.items.length > 0);
    setOrders(barOrders);
  }, []);

  useEffect(() => {
    fetchOrders();
    const pollInterval = setInterval(fetchOrders, 5000);
    const tickInterval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, [fetchOrders]);

  const handleNewItems = useCallback(() => {
    fetchOrders();
    try {
      if (!audioRef.current) audioRef.current = new Audio("/chime.mp3");
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch { /* No audio */ }
  }, [fetchOrders]);

  const handleStatusChanged = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  usePusherChannel("bar", "new-items", handleNewItems);
  usePusherChannel("bar", "item-status-changed", handleStatusChanged);

  const getName = (item: { name: string; nameEs: string }) =>
    locale === "es" ? item.nameEs : item.name;

  const markReady = async (itemId: string) => {
    await fetch(`/api/order-items/${itemId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "READY" }),
    });
    fetchOrders();
  };

  const markAllReady = async (order: DisplayOrder) => {
    await Promise.all(
      order.items
        .filter((i) => i.status !== "READY")
        .map((i) =>
          fetch(`/api/order-items/${i.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "READY" }),
          })
        )
    );
    fetchOrders();
  };

  const getElapsed = (sentAt: string) => {
    const total = Math.floor((Date.now() - new Date(sentAt).getTime()) / 1000);
    return `${Math.floor(total / 60)}m ${(total % 60).toString().padStart(2, "0")}s`;
  };

  const getElapsedColor = (sentAt: string) => {
    const m = (Date.now() - new Date(sentAt).getTime()) / 60000;
    return m > 10 ? "text-red-500" : m > 5 ? "text-yellow-500" : "text-gray-400";
  };

  const getBorderColor = (sentAt: string) => {
    const m = (Date.now() - new Date(sentAt).getTime()) / 60000;
    return m > 10 ? "border-red-600" : m > 5 ? "border-yellow-600" : "border-gray-700";
  };

  return (
    <div className="min-h-dvh bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <h1 className="text-2xl font-bold">{t("display.bar")}</h1>
        <div className="text-gray-400">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </div>
      </header>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-24">
            <p className="text-4xl mb-4">&#x1f378;</p>
            <p className="text-xl">{t("display.noOrders")}</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className={`bg-gray-800 rounded-xl p-5 border-2 ${
                order.items[0]?.sentAt
                  ? getBorderColor(order.items[0].sentAt)
                  : "border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-3xl font-bold">
                    #{order.table.number}
                  </span>
                  <span className="text-gray-400 text-sm ml-2 block">
                    {order.server.name}
                  </span>
                </div>
                {order.items[0]?.sentAt && (
                  <span
                    className={`text-lg font-mono font-bold ${getElapsedColor(
                      order.items[0].sentAt
                    )}`}
                  >
                    {getElapsed(order.items[0].sentAt)}
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-base">
                        <span className="font-bold text-lg">{item.quantity}x</span>{" "}
                        {getName(item.menuItem)}
                      </div>
                      {item.modifiers.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {item.modifiers.map((m) => getName(m.modifier)).join(", ")}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-xs text-yellow-400 italic mt-0.5 font-medium">
                          {item.notes}
                        </div>
                      )}
                    </div>
                    {item.status === "READY" ? (
                      <span className="text-green-400 text-xl font-bold shrink-0">&#x2713;</span>
                    ) : (
                      <button
                        onClick={() => markReady(item.id)}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg active:bg-green-700 touch-manipulation shrink-0"
                      >
                        {t("display.markReady")}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {order.items.some((i) => i.status !== "READY") && (
                <button
                  onClick={() => markAllReady(order)}
                  className="w-full h-14 bg-green-600 text-white font-bold text-lg rounded-xl active:bg-green-700 touch-manipulation"
                >
                  {t("display.markAllReady")}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
