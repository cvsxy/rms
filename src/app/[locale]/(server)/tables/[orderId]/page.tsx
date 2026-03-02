"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatMXN } from "@/lib/utils";
import { SkeletonOrderItems } from "@/components/common/Skeleton";
import ConfirmModal from "@/components/common/ConfirmModal";

interface OrderData {
  id: string;
  status: string;
  table: { number: number; name: string | null };
  server: { id: string; name: string };
  items: {
    id: string; quantity: number; unitPrice: string; notes: string | null; status: string;
    seatNumber: number | null;
    courseNumber: number | null;
    menuItem: { name: string; nameEs: string; destination: string };
    modifiers: { modifier: { name: string; nameEs: string; priceAdj: string } }[];
  }[];
}

interface CourseData {
  courses: { courseNumber: number; fired: boolean; firedAt: string | null }[];
  itemsByCourse: Record<number, string[]>;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  SENT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PREPARING: "bg-blue-100 text-blue-800 border-blue-200",
  READY: "bg-green-100 text-green-800 border-green-200",
  SERVED: "bg-gray-100 text-gray-500 border-gray-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

const VOID_REASONS = ["SERVER_MISTAKE", "KITCHEN_MISTAKE", "OUT_OF_STOCK", "CUSTOMER_REQUEST", "OTHER"] as const;

export default function OrderViewPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingServed, setMarkingServed] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [voidConfirmItemId, setVoidConfirmItemId] = useState<string | null>(null);
  const [voidingItemId, setVoidingItemId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidNote, setVoidNote] = useState("");
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [firingCourse, setFiringCourse] = useState(false);

  useEffect(() => {
    fetchOrder();
    fetchCourses();
    const interval = setInterval(() => { fetchOrder(); fetchCourses(); }, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) { const { data } = await res.json(); setOrder(data); }
    setLoading(false);
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/courses`);
      if (res.ok) {
        const { data } = await res.json();
        setCourseData(data);
      }
    } catch { /* ignore */ }
  };

  const handleFireCourse = async (courseNumber: number) => {
    setFiringCourse(true);
    try {
      await fetch(`/api/orders/${orderId}/courses/fire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseNumber }),
      });
      await Promise.all([fetchOrder(), fetchCourses()]);
    } catch { /* ignore */ }
    setFiringCourse(false);
  };

  const handleMarkServed = async (itemId: string) => {
    setMarkingServed(itemId);
    try {
      await fetch(`/api/order-items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SERVED" }),
      });
      await fetchOrder();
    } catch { /* ignore */ }
    setMarkingServed(null);
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      router.push(`/${locale}/tables`);
      router.refresh();
    } catch { /* ignore */ }
    setCancelling(false);
    setShowCancelConfirm(false);
  };

  const handleVoidItem = async (itemId: string) => {
    if (!voidReason) return;
    setVoidingItemId(itemId);
    try {
      await fetch(`/api/order-items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", voidReason, voidNote: voidNote || null }),
      });
      await fetchOrder();
    } catch { /* ignore */ }
    setVoidingItemId(null);
    setVoidConfirmItemId(null);
    setVoidReason("");
    setVoidNote("");
  };

  const openVoidModal = (itemId: string) => {
    setVoidConfirmItemId(itemId);
    setVoidReason("");
    setVoidNote("");
  };

  const getName = (item: { name: string; nameEs: string }) => locale === "es" ? item.nameEs : item.name;

  const voidReasonLabels: Record<string, string> = {
    SERVER_MISTAKE: t("void.serverMistake"),
    KITCHEN_MISTAKE: t("void.kitchenMistake"),
    OUT_OF_STOCK: t("void.outOfStock"),
    CUSTOMER_REQUEST: t("void.customerRequest"),
    OTHER: t("void.other"),
  };

  if (loading || !order) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <SkeletonOrderItems />
      </div>
    );
  }

  const total = order.items.filter((i) => i.status !== "CANCELLED").reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const canCancel = order.status === "OPEN" || order.status === "SUBMITTED";

  const hasCourses = courseData && courseData.courses.length > 0;
  const nextUnfiredCourse = hasCourses
    ? courseData.courses.find((c) => !c.fired)?.courseNumber ?? null
    : null;

  // Build a set of item IDs that belong to unfired courses (should show HELD)
  const heldItemIds = new Set<string>();
  if (hasCourses && courseData) {
    courseData.courses.forEach((c) => {
      if (!c.fired) {
        const itemIds = courseData.itemsByCourse[c.courseNumber] || [];
        itemIds.forEach((id) => heldItemIds.add(id));
      }
    });
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${locale}/tables`)}
            className="h-10 px-3 flex items-center gap-1 text-blue-600 font-medium rounded-lg active:bg-blue-50 touch-manipulation transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("common.back")}
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            {t("tables.tableNumber", { number: order.table.number })}
          </h2>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[order.status] || "bg-gray-200"}`}>
          {t(`orders.${order.status.toLowerCase()}`)}
        </span>
      </div>

      {/* Course Control Bar */}
      {hasCourses && courseData && (
        <div className="bg-white rounded-xl p-3 border border-gray-200 mb-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-medium text-gray-700">Courses:</span>
            {courseData.courses.map((c) => (
              <span
                key={c.courseNumber}
                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                  c.fired
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-amber-100 text-amber-800 border-amber-200"
                }`}
              >
                C{c.courseNumber}
                {c.fired ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                )}
              </span>
            ))}
          </div>
          {nextUnfiredCourse !== null && (
            <button
              onClick={() => handleFireCourse(nextUnfiredCourse)}
              disabled={firingCourse}
              className="w-full h-11 rounded-lg bg-indigo-600 text-white text-sm font-semibold active:bg-indigo-700 touch-manipulation transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {firingCourse ? (
                "..."
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  </svg>
                  Fire Course {nextUnfiredCourse}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2 mb-4">
        {order.items.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>{t("orders.noItems")}</p>
          </div>
        ) : (
          order.items.map((item) => {
            const isHeld = heldItemIds.has(item.id);
            const isReady = !isHeld && item.status === "READY";
            const isCancelled = item.status === "CANCELLED";
            const isServed = item.status === "SERVED";
            const canVoid = !isCancelled && !isServed;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl p-4 border transition-all ${
                  isCancelled
                    ? "opacity-50 border-gray-100"
                    : isReady
                    ? "border-green-300 ring-2 ring-green-100"
                    : isHeld
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-gray-800 ${isCancelled ? "line-through text-gray-400" : ""}`}>
                        {item.quantity}x {getName(item.menuItem)}
                      </span>
                      {isHeld ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-gray-100 text-gray-500 border-gray-200">
                          HELD
                        </span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColors[item.status]}`}>
                          {t(`orders.${item.status.toLowerCase()}`)}
                        </span>
                      )}
                      {item.courseNumber && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold border bg-indigo-100 text-indigo-700 border-indigo-200">
                          C{item.courseNumber}
                        </span>
                      )}
                      {item.seatNumber && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-purple-100 text-purple-800 border-purple-200">
                          {t("orders.seat")} {item.seatNumber}
                        </span>
                      )}
                    </div>
                    {item.modifiers.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {item.modifiers.map((m) => getName(m.modifier)).join(", ")}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-xs text-gray-400 mt-1 italic">{item.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {canVoid && (
                      <button
                        onClick={() => openVoidModal(item.id)}
                        disabled={voidingItemId === item.id}
                        className="text-xs text-red-500 font-medium px-3 py-2 rounded-lg active:bg-red-50 touch-manipulation border border-red-200 min-h-[44px]"
                      >
                        {voidingItemId === item.id ? "..." : t("orders.voidItem")}
                      </button>
                    )}
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      {formatMXN(Number(item.unitPrice) * item.quantity)}
                    </span>
                  </div>
                </div>
                {/* Mark Served button for READY items */}
                {isReady && (
                  <button
                    onClick={() => handleMarkServed(item.id)}
                    disabled={markingServed === item.id}
                    className="mt-3 w-full h-10 rounded-lg bg-green-600 text-white text-sm font-semibold active:bg-green-700 touch-manipulation transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {markingServed === item.id ? "..." : t("orders.served")}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Subtotal */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
        <div className="flex justify-between text-lg font-bold text-gray-800">
          <span>{t("billing.subtotal")}</span>
          <span>{formatMXN(total)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push(`/${locale}/tables/${orderId}/menu`)}
          className="flex-1 h-14 rounded-xl bg-blue-600 text-white font-semibold active:bg-blue-700 touch-manipulation transition-colors"
        >
          {t("orders.addItems")}
        </button>
        {order.items.length > 0 && (
          <button
            onClick={() => router.push(`/${locale}/tables/${orderId}/bill`)}
            className="flex-1 h-14 rounded-xl bg-gray-800 text-white font-semibold active:bg-gray-900 touch-manipulation transition-colors"
          >
            {t("billing.viewBill")}
          </button>
        )}
      </div>

      {/* Cancel order button */}
      {canCancel && (
        <button
          onClick={() => setShowCancelConfirm(true)}
          disabled={cancelling}
          className="w-full h-12 rounded-xl border-2 border-red-300 text-red-600 font-semibold active:bg-red-50 touch-manipulation transition-colors mt-3 disabled:opacity-50"
        >
          {t("orders.cancelOrder")}
        </button>
      )}

      {/* Cancel order confirmation */}
      <ConfirmModal
        open={showCancelConfirm}
        title={t("orders.cancelOrder")}
        message={t("orders.cancelOrderConfirm")}
        confirmLabel={t("orders.cancelOrder")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={handleCancelOrder}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* Void item modal with reason */}
      {voidConfirmItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setVoidConfirmItemId(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{t("orders.voidItem")}</h3>
            <p className="text-sm text-gray-500 mb-4">{t("orders.voidItemConfirm")}</p>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("void.reason")}</label>
              <select
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full border border-gray-300 rounded-xl h-12 px-3 text-sm"
              >
                <option value="">{t("void.selectReason")}</option>
                {VOID_REASONS.map((r) => (
                  <option key={r} value={r}>{voidReasonLabels[r]}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("void.note")}</label>
              <input
                type="text"
                value={voidNote}
                onChange={(e) => setVoidNote(e.target.value)}
                placeholder={t("void.notePlaceholder")}
                className="w-full border border-gray-300 rounded-xl h-12 px-3 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setVoidConfirmItemId(null)}
                className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 font-medium touch-manipulation hover:bg-gray-50 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleVoidItem(voidConfirmItemId)}
                disabled={!voidReason || voidingItemId === voidConfirmItemId}
                className="flex-1 h-12 rounded-xl bg-red-600 text-white font-semibold active:bg-red-700 touch-manipulation disabled:opacity-50 transition-colors"
              >
                {voidingItemId === voidConfirmItemId ? "..." : t("orders.voidItem")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
