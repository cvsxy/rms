"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatMXN } from "@/lib/utils";

interface OrderData {
  id: string;
  status: string;
  table: { number: number; name: string | null };
  server: { id: string; name: string };
  items: {
    id: string; quantity: number; unitPrice: string; notes: string | null; status: string;
    menuItem: { name: string; nameEs: string; destination: string };
    modifiers: { modifier: { name: string; nameEs: string; priceAdj: string } }[];
  }[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-200 text-gray-700", SENT: "bg-blue-200 text-blue-800",
  PREPARING: "bg-yellow-200 text-yellow-800", READY: "bg-green-200 text-green-800",
  SERVED: "bg-gray-100 text-gray-500", CANCELLED: "bg-red-200 text-red-800",
};

export default function OrderViewPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) { const { data } = await res.json(); setOrder(data); }
    setLoading(false);
  };

  if (loading || !order) return <div className="flex items-center justify-center h-64"><div className="text-gray-400 text-lg">{t("common.loading")}</div></div>;

  const getName = (item: { name: string; nameEs: string }) => locale === "es" ? item.nameEs : item.name;
  const total = order.items.filter((i) => i.status !== "CANCELLED").reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={() => router.push(`/${locale}/tables`)} className="text-blue-600 text-sm mb-1 touch-manipulation">← {t("common.back")}</button>
          <h2 className="text-xl font-bold text-gray-800">{t("tables.tableNumber", { number: order.table.number })}</h2>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[order.status] || "bg-gray-200"}`}>
          {t(`orders.${order.status.toLowerCase()}`)}
        </span>
      </div>
      <div className="space-y-2 mb-4">
        {order.items.length === 0 ? (
          <div className="text-center text-gray-400 py-8">{t("orders.noItems")}</div>
        ) : order.items.map((item) => (
          <div key={item.id} className={`bg-white rounded-xl p-3 border border-gray-100 ${item.status === "CANCELLED" ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{item.quantity}× {getName(item.menuItem)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[item.status]}`}>{t(`orders.${item.status.toLowerCase()}`)}</span>
                </div>
                {item.modifiers.length > 0 && <div className="text-xs text-gray-500 mt-0.5">{item.modifiers.map((m) => getName(m.modifier)).join(", ")}</div>}
                {item.notes && <div className="text-xs text-gray-400 mt-0.5 italic">{item.notes}</div>}
              </div>
              <div className="text-sm font-medium text-gray-700 ml-2">{formatMXN(Number(item.unitPrice) * item.quantity)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
        <div className="flex justify-between text-lg font-bold text-gray-800"><span>Subtotal</span><span>{formatMXN(total)}</span></div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => router.push(`/${locale}/tables/${orderId}/menu`)} className="flex-1 h-14 rounded-xl bg-blue-600 text-white font-semibold active:bg-blue-700 touch-manipulation">{t("orders.addItems")}</button>
        {order.items.length > 0 && (
          <button onClick={() => router.push(`/${locale}/tables/${orderId}/bill`)} className="flex-1 h-14 rounded-xl bg-gray-800 text-white font-semibold active:bg-gray-900 touch-manipulation">{t("billing.viewBill")}</button>
        )}
      </div>
    </div>
  );
}
