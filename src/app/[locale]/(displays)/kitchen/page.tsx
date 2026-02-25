"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

interface DisplayItem { id: string; quantity: number; notes: string | null; status: string; sentAt: string; menuItem: { name: string; nameEs: string; destination: string }; modifiers: { modifier: { name: string; nameEs: string } }[]; }
interface DisplayOrder { id: string; table: { number: number }; server: { name: string }; items: DisplayItem[]; }

export default function KitchenDisplayPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);

  useEffect(() => { fetchOrders(); const interval = setInterval(fetchOrders, 3000); return () => clearInterval(interval); }, []);

  const fetchOrders = async () => {
    const res = await fetch("/api/orders?status=SUBMITTED");
    const { data } = await res.json();
    const kitchenOrders = data.map((order: DisplayOrder) => ({
      ...order, items: order.items.filter((i: DisplayItem) => i.menuItem?.destination === "KITCHEN" && i.status !== "SERVED" && i.status !== "CANCELLED"),
    })).filter((order: DisplayOrder) => order.items.length > 0);
    setOrders(kitchenOrders);
  };

  const getName = (item: { name: string; nameEs: string }) => locale === "es" ? item.nameEs : item.name;

  const markReady = async (itemId: string) => {
    await fetch(`/api/order-items/${itemId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "READY" }) });
    fetchOrders();
  };

  const markAllReady = async (order: DisplayOrder) => {
    await Promise.all(order.items.filter((i) => i.status !== "READY").map((i) => fetch(`/api/order-items/${i.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "READY" }) })));
    fetchOrders();
  };

  const getElapsed = (sentAt: string) => { const total = Math.floor((Date.now() - new Date(sentAt).getTime()) / 1000); return `${Math.floor(total / 60)}m ${(total % 60).toString().padStart(2, "0")}s`; };
  const getElapsedColor = (sentAt: string) => { const m = (Date.now() - new Date(sentAt).getTime()) / 60000; return m > 10 ? "text-red-600" : m > 5 ? "text-yellow-600" : "text-gray-500"; };

  return (
    <div className="min-h-dvh bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">🍳 {t("display.kitchen")}</h1>
        <div className="text-gray-400 text-sm">{orders.length} {t("orders.title").toLowerCase()}</div>
      </header>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.length === 0 ? <div className="col-span-full text-center text-gray-500 py-20 text-lg">{t("common.noResults")}</div> : orders.map((order) => (
          <div key={order.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div><span className="text-2xl font-bold">#{order.table.number}</span><span className="text-gray-400 text-sm ml-2">{order.server.name}</span></div>
              {order.items[0]?.sentAt && <span className={`text-sm font-mono ${getElapsedColor(order.items[0].sentAt)}`}>{getElapsed(order.items[0].sentAt)}</span>}
            </div>
            <div className="space-y-2 mb-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm"><span className="font-medium">{item.quantity}×</span> {getName(item.menuItem)}</div>
                    {item.modifiers.length > 0 && <div className="text-xs text-gray-400">{item.modifiers.map((m) => getName(m.modifier)).join(", ")}</div>}
                    {item.notes && <div className="text-xs text-yellow-400 italic">⚠ {item.notes}</div>}
                  </div>
                  {item.status === "READY" ? <span className="text-green-400 text-sm font-medium">✓</span> : <button onClick={() => markReady(item.id)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg active:bg-green-700 touch-manipulation">{t("display.markReady")}</button>}
                </div>
              ))}
            </div>
            {order.items.some((i) => i.status !== "READY") && <button onClick={() => markAllReady(order)} className="w-full h-12 bg-green-600 text-white font-semibold rounded-xl active:bg-green-700 touch-manipulation">{t("display.markAllReady")}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
