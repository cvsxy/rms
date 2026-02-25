"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

interface TableData {
  id: string;
  number: number;
  name: string | null;
  seats: number;
  status: string;
  orders: { id: string; server: { name: string }; createdAt: string }[];
}

export default function TablesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTables(); }, []);

  const fetchTables = async () => {
    const res = await fetch("/api/tables");
    const { data } = await res.json();
    setTables(data);
    setLoading(false);
  };

  const handleTableTap = async (table: TableData) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: table.id }),
    });
    const { data: order } = await res.json();
    router.push(`/${locale}/tables/${order.id}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400 text-lg">{t("common.loading")}</div></div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{t("tables.title")}</h2>
      <div className="grid grid-cols-3 gap-3">
        {tables.map((table) => {
          const isOccupied = table.status === "OCCUPIED";
          const activeOrder = table.orders[0];
          return (
            <button key={table.id} onClick={() => handleTableTap(table)} className={`p-4 rounded-xl border-2 text-left touch-manipulation transition-colors ${isOccupied ? "bg-red-50 border-red-300 active:bg-red-100" : "bg-green-50 border-green-300 active:bg-green-100"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-bold text-gray-800">{table.number}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOccupied ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"}`}>
                  {isOccupied ? t("tables.occupied") : t("tables.available")}
                </span>
              </div>
              {table.name && <div className="text-xs text-gray-500 mb-1">{table.name}</div>}
              <div className="text-xs text-gray-400">{t("tables.seats", { count: table.seats })}</div>
              {activeOrder && <div className="text-xs text-gray-500 mt-1">{activeOrder.server.name}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
