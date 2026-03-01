"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { SkeletonTableGrid } from "@/components/common/Skeleton";

interface TableData {
  id: string;
  number: number;
  name: string | null;
  seats: number;
  status: string;
  posX: number | null;
  posY: number | null;
  orders: { id: string; server: { name: string }; createdAt: string }[];
}

export default function TablesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [useCustomLayout, setUseCustomLayout] = useState(false);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch("/api/tables");
      const json = await res.json();
      setTables(json.data);
      if (json.settings) setUseCustomLayout(json.settings.useCustomLayout);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 15000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  const handleTableTap = async (table: TableData) => {
    if (table.status === "OCCUPIED" && table.orders[0]) {
      router.push(`/${locale}/tables/${table.orders[0].id}`);
      return;
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: table.id }),
    });
    const { data: order } = await res.json();
    router.push(`/${locale}/tables/${order.id}`);
  };

  // Check if custom layout should be used (enabled + tables have positions)
  const hasCustomLayout =
    useCustomLayout && tables.some((t) => t.posX != null && t.posY != null);

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-4" />
        <SkeletonTableGrid />
      </div>
    );
  }

  function renderTableButton(table: TableData) {
    const isOccupied = table.status === "OCCUPIED";
    const isReserved = table.status === "RESERVED";
    const activeOrder = table.orders[0];

    return (
      <button
        key={table.id}
        onClick={() => handleTableTap(table)}
        className={`p-4 rounded-xl border-2 text-left touch-manipulation transition-colors ${
          hasCustomLayout ? "w-[120px] h-[90px]" : "min-h-[100px]"
        } ${
          isOccupied
            ? "bg-red-50 border-red-300 active:bg-red-100"
            : isReserved
            ? "bg-yellow-50 border-yellow-300 active:bg-yellow-100"
            : "bg-green-50 border-green-300 active:bg-green-100"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg font-bold text-gray-800">{table.number}</span>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              isOccupied
                ? "bg-red-200 text-red-800"
                : isReserved
                ? "bg-yellow-200 text-yellow-800"
                : "bg-green-200 text-green-800"
            }`}
          >
            {isOccupied
              ? t("tables.occupied")
              : isReserved
              ? t("tables.reserved")
              : t("tables.available")}
          </span>
        </div>
        {table.name && (
          <div className="text-xs text-gray-500 mb-1 truncate">{table.name}</div>
        )}
        <div className="text-xs text-gray-400">
          {t("tables.seats", { count: table.seats })}
        </div>
        {activeOrder && (
          <div className="text-xs text-gray-500 mt-1 font-medium truncate">
            {activeOrder.server.name}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{t("tables.title")}</h2>

      {hasCustomLayout ? (
        /* Custom layout: absolutely positioned tables in scrollable container */
        <div className="overflow-auto">
          <div
            className="relative"
            style={{
              width: 800,
              height: 560,
              minWidth: 800,
            }}
          >
            {tables.map((table) => (
              <div
                key={table.id}
                style={{
                  position: "absolute",
                  left: table.posX ?? 0,
                  top: table.posY ?? 0,
                }}
              >
                {renderTableButton(table)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Default grid layout */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map((table) => renderTableButton(table))}
        </div>
      )}
    </div>
  );
}
