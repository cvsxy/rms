"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatMXN } from "@/lib/utils";
import { SkeletonOrderItems } from "@/components/common/Skeleton";

interface OrderData {
  id: string; table: { number: number };
  items: { id: string; quantity: number; unitPrice: string; status: string; menuItem: { name: string; nameEs: string }; modifiers: { modifier: { name: string; nameEs: string }; priceAdj: string }[]; }[];
}

type TipPreset = "10" | "15" | "20" | "none" | "custom";

export default function BillPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [tip, setTip] = useState(0);
  const [tipPreset, setTipPreset] = useState<TipPreset>("none");
  const [showConfirm, setShowConfirm] = useState<"CASH" | "CARD" | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then(({ data }) => setOrder(data));
  }, [orderId]);

  if (!order) {
    return (
      <div className="p-4">
        <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse mb-4" />
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <SkeletonOrderItems />
      </div>
    );
  }

  const getName = (item: { name: string; nameEs: string }) => locale === "es" ? item.nameEs : item.name;
  const activeItems = order.items.filter((i) => i.status !== "CANCELLED");
  const subtotal = activeItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax + tip;

  const handleTipPreset = (preset: TipPreset) => {
    setTipPreset(preset);
    if (preset === "none") setTip(0);
    else if (preset === "custom") { /* keep current tip, user will type */ }
    else setTip(Math.round(subtotal * (Number(preset) / 100)));
  };

  const handlePayment = async (method: "CASH" | "CARD") => {
    setProcessing(true);
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, method, tip }),
    });
    router.push(`/${locale}/tables`);
    router.refresh();
  };

  const tipPresets: { key: TipPreset; label: string }[] = [
    { key: "none", label: t("billing.noTip") },
    { key: "10", label: "10%" },
    { key: "15", label: "15%" },
    { key: "20", label: "20%" },
    { key: "custom", label: t("billing.customTip") },
  ];

  return (
    <div className="p-4">
      {/* Back button */}
      <button
        onClick={() => router.push(`/${locale}/tables/${orderId}`)}
        className="h-10 px-3 flex items-center gap-1 text-blue-600 font-medium rounded-lg active:bg-blue-50 touch-manipulation transition-colors mb-3"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("common.back")}
      </button>

      <h2 className="text-xl font-bold text-gray-800 mb-4">
        {t("tables.tableNumber", { number: order.table.number })} — {t("billing.viewBill")}
      </h2>

      {/* Items list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-4">
        {activeItems.map((item) => (
          <div key={item.id} className="p-4 flex justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">
                {item.quantity}x {getName(item.menuItem)}
              </div>
              {item.modifiers.length > 0 && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {item.modifiers.map((m) => getName(m.modifier)).join(", ")}
                </div>
              )}
            </div>
            <div className="text-sm font-medium text-gray-700">
              {formatMXN(Number(item.unitPrice) * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      {/* Tip presets */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">{t("billing.tip")}</p>
        <div className="flex gap-2 flex-wrap">
          {tipPresets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handleTipPreset(preset.key)}
              className={`h-11 px-4 rounded-xl text-sm font-medium touch-manipulation transition-colors border ${
                tipPreset === preset.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 active:bg-gray-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {tipPreset === "custom" && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="number"
              min="0"
              value={tip || ""}
              onChange={(e) => setTip(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-32 h-12 px-4 rounded-xl border border-gray-300 text-sm font-medium"
              inputMode="numeric"
            />
          </div>
        )}
      </div>

      {/* Bill summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 mb-6">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{t("billing.subtotal")}</span>
          <span>{formatMXN(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>{t("billing.tax")}</span>
          <span>{formatMXN(tax)}</span>
        </div>
        {tip > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>{t("billing.tip")}</span>
            <span>{formatMXN(tip)}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold text-gray-800">
          <span>{t("billing.total")}</span>
          <span>{formatMXN(total)}</span>
        </div>
      </div>

      {/* Payment buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowConfirm("CASH")}
          className="flex-1 h-16 rounded-xl bg-green-600 text-white text-lg font-semibold active:bg-green-700 touch-manipulation transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          {t("billing.payWithCash")}
        </button>
        <button
          onClick={() => setShowConfirm("CARD")}
          className="flex-1 h-16 rounded-xl bg-blue-600 text-white text-lg font-semibold active:bg-blue-700 touch-manipulation transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          {t("billing.payWithCard")}
        </button>
      </div>

      {/* Confirm payment modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowConfirm(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t("billing.confirmPayment")}</h3>
            <div className="space-y-1 mb-4">
              <p className="text-gray-600">
                {t("billing.total")}: <strong className="text-lg">{formatMXN(total)}</strong>
              </p>
              <p className="text-sm text-gray-500">
                {showConfirm === "CASH" ? t("billing.payWithCash") : t("billing.payWithCard")}
              </p>
              {tip > 0 && (
                <p className="text-sm text-gray-500">
                  {t("billing.tip")}: {formatMXN(tip)}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 font-medium touch-manipulation hover:bg-gray-50 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handlePayment(showConfirm)}
                disabled={processing}
                className="flex-1 h-12 rounded-xl bg-green-600 text-white font-semibold active:bg-green-700 touch-manipulation disabled:opacity-50 transition-colors"
              >
                {processing ? "..." : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
