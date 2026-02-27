"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePusherChannel } from "@/hooks/usePusher";

interface IngredientInfo {
  name: string;
  nameEs: string;
  unit: string;
  quantity: number;
}

interface DisplayItem {
  id: string;
  quantity: number;
  notes: string | null;
  status: string;
  sentAt: string;
  readyAt: string | null;
  seatNumber: number | null;
  menuItemId: string;
  menuItem: { name: string; nameEs: string; destination: string };
  modifiers: { modifier: { name: string; nameEs: string } }[];
}

interface DisplayOrder {
  id: string;
  table: { number: number; name: string | null };
  server: { name: string };
  items: DisplayItem[];
}

export default function KitchenDisplayPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [collapsedOrders, setCollapsedOrders] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ingredientMap, setIngredientMap] = useState<Record<string, IngredientInfo[]>>({});

  const fetchIngredientMap = useCallback(async () => {
    try {
      const res = await fetch("/api/menu/categories");
      if (!res.ok) return;
      const { data } = await res.json();
      const map: Record<string, IngredientInfo[]> = {};
      for (const cat of data) {
        for (const item of cat.items || []) {
          if (item.ingredients && item.ingredients.length > 0) {
            map[item.id] = item.ingredients.map((ing: { quantity: number; ingredient: { name: string; nameEs: string; unit: string } }) => ({
              name: ing.ingredient.name,
              nameEs: ing.ingredient.nameEs,
              unit: ing.ingredient.unit,
              quantity: Number(ing.quantity),
            }));
          }
        }
      }
      setIngredientMap(map);
    } catch { /* ignore */ }
  }, []);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders?status=SUBMITTED");
    if (!res.ok) return;
    const { data } = await res.json();
    const kitchenOrders = (data as DisplayOrder[])
      .map((order) => ({
        ...order,
        items: order.items.filter(
          (i) =>
            i.menuItem?.destination === "KITCHEN" &&
            i.status !== "SERVED" &&
            i.status !== "CANCELLED"
        ),
      }))
      .filter((order) => order.items.length > 0);
    setOrders(kitchenOrders);
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchIngredientMap();
    const pollInterval = setInterval(fetchOrders, 5000);
    const tickInterval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, [fetchOrders, fetchIngredientMap]);

  const handleNewItems = useCallback(() => {
    fetchOrders();
    fetchIngredientMap();
    try {
      if (!audioRef.current) audioRef.current = new Audio("/chime.mp3");
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch { /* No audio */ }
  }, [fetchOrders, fetchIngredientMap]);

  const handleStatusChanged = useCallback(() => { fetchOrders(); }, [fetchOrders]);

  usePusherChannel("kitchen", "new-items", handleNewItems);
  usePusherChannel("kitchen", "item-status-changed", handleStatusChanged);

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

  const allReady = (order: DisplayOrder) => order.items.every((i) => i.status === "READY");

  const getElapsedForOrder = (order: DisplayOrder) => {
    const isAllReady = allReady(order);
    if (isAllReady) {
      // Show frozen time: time between first sent and last ready
      const firstSent = Math.min(...order.items.map((i) => new Date(i.sentAt).getTime()));
      const lastReady = Math.max(...order.items.filter((i) => i.readyAt).map((i) => new Date(i.readyAt!).getTime()));
      if (lastReady > 0) {
        const total = Math.floor((lastReady - firstSent) / 1000);
        return { text: `${Math.floor(total / 60)}m ${(total % 60).toString().padStart(2, "0")}s`, frozen: true };
      }
    }
    // Live timer
    const firstSent = order.items[0]?.sentAt;
    if (!firstSent) return { text: "", frozen: false };
    const total = Math.floor((Date.now() - new Date(firstSent).getTime()) / 1000);
    return { text: `${Math.floor(total / 60)}m ${(total % 60).toString().padStart(2, "0")}s`, frozen: false };
  };

  const getElapsedColor = (sentAt: string, frozen: boolean) => {
    if (frozen) return "text-green-400";
    const m = (Date.now() - new Date(sentAt).getTime()) / 60000;
    return m > 10 ? "text-red-500" : m > 5 ? "text-yellow-500" : "text-gray-400";
  };

  const getBorderColor = (order: DisplayOrder) => {
    if (allReady(order)) return "border-green-600";
    const sentAt = order.items[0]?.sentAt;
    if (!sentAt) return "border-gray-700";
    const m = (Date.now() - new Date(sentAt).getTime()) / 60000;
    return m > 10 ? "border-red-600" : m > 5 ? "border-yellow-600" : "border-gray-700";
  };

  const toggleCollapse = (orderId: string) => {
    setCollapsedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-gray-900 text-white">
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700 safe-area-top">
        <h1 className="text-2xl font-bold">{t("display.kitchen")}</h1>
        <div className="text-gray-400">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </div>
      </header>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-24">
            <p className="text-4xl mb-4">&#x1f468;&#x200d;&#x1f373;</p>
            <p className="text-xl">{t("display.noOrders")}</p>
          </div>
        ) : (
          orders.map((order) => {
            const isAllReady = allReady(order);
            const isCollapsed = collapsedOrders.has(order.id);
            const elapsed = getElapsedForOrder(order);
            return (
              <div
                key={order.id}
                className={`bg-gray-800 rounded-xl p-5 border-2 transition-all ${getBorderColor(order)}`}
              >
                {/* Order header — always visible */}
                <div
                  className="flex items-center justify-between mb-4 cursor-pointer"
                  onClick={() => isAllReady && toggleCollapse(order.id)}
                >
                  <div>
                    <span className="text-3xl font-bold">
                      #{order.table.number}
                    </span>
                    <span className="text-gray-400 text-sm ml-2 block">
                      {order.server.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-mono font-bold ${getElapsedColor(order.items[0]?.sentAt || "", elapsed.frozen)}`}>
                      {elapsed.text}
                    </span>
                    {isAllReady && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(order.id); }}
                        className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 active:bg-gray-600 touch-manipulation"
                      >
                        <svg className={`w-5 h-5 transition-transform ${isCollapsed ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsed: show item count */}
                {isCollapsed ? (
                  <div className="text-center text-green-400 font-medium text-sm py-2">
                    ✓ {order.items.length} {order.items.length === 1 ? "item" : "items"} {t("display.allReady").toLowerCase()}
                  </div>
                ) : (
                  <>
                    {/* Items list */}
                    <div className="space-y-3 mb-4">
                      {order.items.map((item) => {
                        const ingredients = ingredientMap[item.menuItemId];
                        return (
                          <div key={item.id} className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-base">
                                <span className="font-bold text-lg">{item.quantity}x</span>{" "}
                                {item.seatNumber && (
                                  <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded mr-1 font-medium">
                                    S{item.seatNumber}
                                  </span>
                                )}
                                {getName(item.menuItem)}
                              </div>
                              {item.modifiers.length > 0 && (
                                <div className="text-sm text-gray-400 mt-0.5">
                                  {item.modifiers.map((m) => getName(m.modifier)).join(", ")}
                                </div>
                              )}
                              {ingredients && ingredients.length > 0 && (
                                <div className="text-xs text-emerald-400/80 mt-0.5">
                                  {ingredients.map((ing) => `${getName(ing)} ${ing.quantity}${ing.unit}`).join(", ")}
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-sm text-yellow-400 italic mt-1 font-medium bg-yellow-900/30 rounded px-2 py-1">
                                  📝 {item.notes}
                                </div>
                              )}
                            </div>
                            {item.status === "READY" ? (
                              <span className="text-green-400 text-xl font-bold shrink-0">✓</span>
                            ) : (
                              <button
                                onClick={() => markReady(item.id)}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg active:bg-green-700 touch-manipulation shrink-0"
                              >
                                {t("display.markReady")}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Mark All Ready button */}
                    {order.items.some((i) => i.status !== "READY") && (
                      <button
                        onClick={() => markAllReady(order)}
                        className="w-full h-14 bg-green-600 text-white font-bold text-lg rounded-xl active:bg-green-700 touch-manipulation"
                      >
                        {t("display.markAllReady")}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
