"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatMXN } from "@/lib/utils";
import { SkeletonOrderItems } from "@/components/common/Skeleton";

interface OrderData {
  id: string; table: { number: number };
  items: { id: string; quantity: number; unitPrice: string; status: string; seatNumber: number | null; menuItem: { name: string; nameEs: string }; modifiers: { modifier: { name: string; nameEs: string }; priceAdj: string }[]; }[];
}

interface AvailableDiscount {
  id: string; name: string; nameEs: string; type: "PERCENTAGE" | "FIXED"; value: number; code: string | null;
}

interface AppliedDiscount {
  id: string; type: "PERCENTAGE" | "FIXED"; value: number; note: string | null;
  discount: AvailableDiscount | null;
  appliedBy: { name: string };
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
  const [filterSeat, setFilterSeat] = useState<number | null>(null);
  // Discounts
  const [availableDiscounts, setAvailableDiscounts] = useState<AvailableDiscount[]>([]);
  const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedDiscount[]>([]);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountTab, setDiscountTab] = useState<"preset" | "comp">("preset");
  const [compType, setCompType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [compValue, setCompValue] = useState("");
  const [compNote, setCompNote] = useState("");

  const fetchAppliedDiscounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/discounts`);
      const json = await res.json();
      setAppliedDiscounts(json.data || []);
    } catch { /* ignore */ }
  }, [orderId]);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then(({ data }) => setOrder(data));
    fetch("/api/discounts")
      .then((r) => r.json())
      .then(({ data }) => setAvailableDiscounts(data || []));
    fetchAppliedDiscounts();
  }, [orderId, fetchAppliedDiscounts]);

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
  const seatNumbers = [...new Set(activeItems.map((i) => i.seatNumber).filter(Boolean))] as number[];
  const displayItems = filterSeat !== null ? activeItems.filter((i) => i.seatNumber === filterSeat) : activeItems;
  const subtotal = activeItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const displaySubtotal = displayItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);

  // Calculate discount
  let totalDiscount = 0;
  for (const d of appliedDiscounts) {
    if (d.type === "PERCENTAGE") {
      totalDiscount += subtotal * Number(d.value) / 100;
    } else {
      totalDiscount += Number(d.value);
    }
  }
  totalDiscount = Math.min(totalDiscount, subtotal);

  const discountedSubtotal = subtotal - totalDiscount;
  const tax = discountedSubtotal * 0.16;
  const total = discountedSubtotal + tax + tip;

  const handleTipPreset = (preset: TipPreset) => {
    setTipPreset(preset);
    if (preset === "none") setTip(0);
    else if (preset === "custom") { /* keep current tip, user will type */ }
    else setTip(Math.round(discountedSubtotal * (Number(preset) / 100)));
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

  const applyPresetDiscount = async (d: AvailableDiscount) => {
    await fetch(`/api/orders/${orderId}/discounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discountId: d.id, type: d.type, value: d.value }),
    });
    await fetchAppliedDiscounts();
    setShowDiscountModal(false);
  };

  const applyComp = async () => {
    if (!compValue) return;
    await fetch(`/api/orders/${orderId}/discounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: compType, value: parseFloat(compValue), note: compNote || null }),
    });
    await fetchAppliedDiscounts();
    setShowDiscountModal(false);
    setCompValue("");
    setCompNote("");
  };

  const removeDiscount = async (discountApplicationId: string) => {
    await fetch(`/api/orders/${orderId}/discounts?discountId=${discountApplicationId}`, {
      method: "DELETE",
    });
    await fetchAppliedDiscounts();
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

      {/* Seat filter */}
      {seatNumbers.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">{t("billing.filterBySeat")}</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterSeat(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium touch-manipulation border transition-colors ${
                filterSeat === null ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {t("billing.allSeats")}
            </button>
            {seatNumbers.sort((a, b) => a - b).map((num) => (
              <button
                key={num}
                onClick={() => setFilterSeat(num)}
                className={`px-3 py-2 rounded-lg text-sm font-medium touch-manipulation border transition-colors ${
                  filterSeat === num ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                {t("orders.seat", { number: num })}
              </button>
            ))}
          </div>
          {filterSeat !== null && (
            <p className="text-xs text-gray-500 mt-1">{t("billing.seatFilterNote")}</p>
          )}
        </div>
      )}

      {/* Items list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-4">
        {displayItems.map((item) => (
          <div key={item.id} className="p-4 flex justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">
                {item.quantity}x {getName(item.menuItem)}
                {item.seatNumber && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                    S{item.seatNumber}
                  </span>
                )}
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

      {/* Discount section */}
      {appliedDiscounts.length > 0 && (
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-3 mb-4 space-y-2">
          {appliedDiscounts.map((ad) => (
            <div key={ad.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                  {ad.discount ? getName(ad.discount) : t("discounts.comp")}
                </span>
                <span className="text-sm text-purple-700">
                  -{ad.type === "PERCENTAGE" ? `${ad.value}%` : formatMXN(Number(ad.value))}
                </span>
                {ad.note && <span className="text-xs text-purple-500 italic">{ad.note}</span>}
              </div>
              <button
                onClick={() => removeDiscount(ad.id)}
                className="text-xs text-red-500 font-medium px-2 py-1 rounded active:bg-red-50"
              >
                {t("discounts.removeDiscount")}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowDiscountModal(true)}
        className="w-full h-11 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 text-sm font-medium active:bg-purple-50 touch-manipulation transition-colors mb-4 flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        {t("discounts.applyDiscount")}
      </button>

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
        {filterSeat !== null && (
          <div className="flex justify-between text-sm text-purple-600 font-medium">
            <span>{t("orders.seat", { number: filterSeat })}</span>
            <span>{formatMXN(displaySubtotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-600">
          <span>{t("billing.subtotal")}</span>
          <span>{formatMXN(subtotal)}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex justify-between text-sm text-purple-600 font-medium">
            <span>{t("discounts.discountTotal")}</span>
            <span>-{formatMXN(totalDiscount)}</span>
          </div>
        )}
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
              {totalDiscount > 0 && (
                <p className="text-sm text-purple-600">
                  {t("discounts.discountTotal")}: -{formatMXN(totalDiscount)}
                </p>
              )}
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

      {/* Discount modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowDiscountModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t("discounts.applyDiscount")}</h3>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDiscountTab("preset")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg ${
                  discountTab === "preset" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t("discounts.selectDiscount")}
              </button>
              <button
                onClick={() => setDiscountTab("comp")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg ${
                  discountTab === "comp" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t("discounts.customDiscount")}
              </button>
            </div>

            {discountTab === "preset" ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableDiscounts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">{t("discounts.noDiscounts")}</p>
                ) : (
                  availableDiscounts.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => applyPresetDiscount(d)}
                      className="w-full p-3 rounded-xl border border-gray-200 text-left hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800">{getName(d)}</span>
                        <span className="text-sm font-semibold text-purple-600">
                          {d.type === "PERCENTAGE" ? `${d.value}%` : formatMXN(Number(d.value))}
                        </span>
                      </div>
                      {d.code && <span className="text-xs text-gray-400 font-mono">{d.code}</span>}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCompType("PERCENTAGE")}
                    className={`flex-1 py-2 text-sm rounded-lg border ${
                      compType === "PERCENTAGE" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {t("discounts.percentage")}
                  </button>
                  <button
                    onClick={() => setCompType("FIXED")}
                    className={`flex-1 py-2 text-sm rounded-lg border ${
                      compType === "FIXED" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {t("discounts.fixed")}
                  </button>
                </div>
                <input
                  type="number"
                  value={compValue}
                  onChange={(e) => setCompValue(e.target.value)}
                  placeholder={compType === "PERCENTAGE" ? "10" : "50.00"}
                  className="w-full h-12 px-3 border rounded-xl text-sm"
                  min="0"
                  step={compType === "PERCENTAGE" ? "1" : "0.01"}
                />
                <input
                  type="text"
                  value={compNote}
                  onChange={(e) => setCompNote(e.target.value)}
                  placeholder={t("discounts.enterReason")}
                  className="w-full h-12 px-3 border rounded-xl text-sm"
                />
                <button
                  onClick={applyComp}
                  disabled={!compValue}
                  className="w-full h-12 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-50"
                >
                  {t("discounts.applyDiscount")}
                </button>
              </div>
            )}

            <button
              onClick={() => setShowDiscountModal(false)}
              className="w-full h-11 mt-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
