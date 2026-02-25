"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatMXN } from "@/lib/utils";

interface OrderData {
  id: string; table: { number: number };
  items: { id: string; quantity: number; unitPrice: string; status: string; menuItem: { name: string; nameEs: string }; modifiers: { modifier: { name: string; nameEs: string }; priceAdj: string }[]; }[];
}

export default function BillPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [tip, setTip] = useState(0);
  const [showConfirm, setShowConfirm] = useState<"CASH" | "CARD" | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetch(`/api/orders/${orderId}`).then((r) => r.json()).then(({ data }) => setOrder(data)); }, [orderId]);

  if (!order) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">{t("common.loading")}</div></div>;

  const getName = (item: { name: string; nameEs: string }) => locale === "es" ? item.nameEs : item.name;
  const activeItems = order.items.filter((i) => i.status !== "CANCELLED");
  const subtotal = activeItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax + tip;

  const handlePayment = async (method: "CASH" | "CARD") => {
    setProcessing(true);
    await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, method, tip }) });
    router.push(`/${locale}/tables`);
    router.refresh();
  };

  return (
    <div className="p-4">
      <button onClick={() => router.push(`/${locale}/tables/${orderId}`)} className="text-blue-600 text-sm mb-4 touch-manipulation">← {t("common.back")}</button>
      <h2 className="text-xl font-bold text-gray-800 mb-4">{t("tables.tableNumber", { number: order.table.number })} — {t("billing.viewBill")}</h2>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-4">
        {activeItems.map((item) => (
          <div key={item.id} className="p-3 flex justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">{item.quantity}× {getName(item.menuItem)}</div>
              {item.modifiers.length > 0 && <div className="text-xs text-gray-400">{item.modifiers.map((m) => getName(m.modifier)).join(", ")}</div>}
            </div>
            <div className="text-sm font-medium text-gray-700">{formatMXN(Number(item.unitPrice) * item.quantity)}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2 mb-4">
        <div className="flex justify-between text-sm text-gray-600"><span>{t("billing.subtotal")}</span><span>{formatMXN(subtotal)}</span></div>
        <div className="flex justify-between text-sm text-gray-600"><span>{t("billing.tax")}</span><span>{formatMXN(tax)}</span></div>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>{t("billing.tip")}</span>
          <input type="number" min="0" value={tip || ""} onChange={(e) => setTip(Number(e.target.value) || 0)} placeholder="0" className="w-24 text-right h-8 px-2 rounded border border-gray-300 text-sm" />
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold text-gray-800"><span>{t("billing.total")}</span><span>{formatMXN(total)}</span></div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setShowConfirm("CASH")} className="flex-1 h-16 rounded-xl bg-green-600 text-white text-lg font-semibold active:bg-green-700 touch-manipulation">💵 {t("billing.payWithCash")}</button>
        <button onClick={() => setShowConfirm("CARD")} className="flex-1 h-16 rounded-xl bg-blue-600 text-white text-lg font-semibold active:bg-blue-700 touch-manipulation">💳 {t("billing.payWithCard")}</button>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowConfirm(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t("common.confirm")}</h3>
            <p className="text-gray-600 mb-4">{t("billing.total")}: <strong>{formatMXN(total)}</strong> — {showConfirm === "CASH" ? t("billing.payWithCash") : t("billing.payWithCard")}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)} className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 font-medium touch-manipulation">{t("common.cancel")}</button>
              <button onClick={() => handlePayment(showConfirm)} disabled={processing} className="flex-1 h-12 rounded-xl bg-green-600 text-white font-semibold active:bg-green-700 touch-manipulation disabled:opacity-50">{processing ? "..." : t("common.confirm")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
