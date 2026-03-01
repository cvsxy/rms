"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { downloadCSV, formatMoney } from "./csvExport";

interface CloseRecord {
  id: string;
  date: string;
  expectedCash: number;
  actualCash: number;
  variance: number;
  cardTotal: number;
  totalRevenue: number;
  totalTax: number;
  totalTips: number;
  totalDiscount: number;
  subtotal: number;
  orderCount: number;
  closedByName: string;
  notes: string | null;
  createdAt: string;
}

interface DailyCloseTabProps {
  fromDate: string;
  toDate: string;
}

export default function DailyCloseTab({ fromDate, toDate }: DailyCloseTabProps) {
  const t = useTranslations();
  const [closes, setCloses] = useState<CloseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedCash, setExpectedCash] = useState(0);
  const [cardTotal, setCardTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [todayClosed, setTodayClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const fetchCloses = useCallback(async () => {
    try {
      const res = await fetch(`/api/daily-close?from=${fromDate}&to=${toDate}`);
      const json = await res.json();
      setCloses(json.data || []);
      // Check if today is already closed
      setTodayClosed((json.data || []).some((c: CloseRecord) => c.date === today));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [fromDate, toDate, today]);

  useEffect(() => {
    fetchCloses();
  }, [fetchCloses]);

  async function openCloseModal() {
    setError(null);
    // Fetch today's expected cash from the close endpoint (pre-calculate)
    try {
      const res = await fetch(`/api/reports?from=${today}T00:00:00&to=${today}T23:59:59`);
      const json = await res.json();
      if (json.data?.summary) {
        setExpectedCash(json.data.summary.cashTotal || 0);
        setCardTotal(json.data.summary.cardTotal || 0);
      }
    } catch {
      /* ignore */
    }
    setActualCash("");
    setNotes("");
    setShowModal(true);
  }

  async function handleClose() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          actualCash: parseFloat(actualCash) || 0,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Error");
        setSubmitting(false);
        return;
      }
      setShowModal(false);
      setTodayClosed(true);
      fetchCloses();
    } catch {
      setError("Error");
    }
    setSubmitting(false);
  }

  const variance = (parseFloat(actualCash) || 0) - expectedCash;

  function exportCloseHistory() {
    const lines: string[] = [];
    lines.push(`Daily Close History,${fromDate} to ${toDate}`);
    lines.push("");
    lines.push("Date,Orders,Subtotal,Tax,Revenue,Cash Expected,Cash Actual,Variance,Card Total,Closed By,Notes");
    for (const c of closes) {
      lines.push(
        `${c.date},${c.orderCount},${formatMoney(c.subtotal)},${formatMoney(c.totalTax)},${formatMoney(c.totalRevenue)},${formatMoney(c.expectedCash)},${formatMoney(c.actualCash)},${formatMoney(c.variance)},${formatMoney(c.cardTotal)},${c.closedByName},${c.notes || ""}`
      );
    }
    downloadCSV(`rms-closes-${fromDate}-to-${toDate}.csv`, lines);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">{t("reports.closeHistory")}</h2>
        <div className="flex gap-2 flex-wrap">
          {!todayClosed && (
            <button
              onClick={openCloseModal}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              {t("reports.closeToday")}
            </button>
          )}
          {todayClosed && (
            <span className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
              ✓ {t("reports.alreadyClosed")}
            </span>
          )}
          {closes.length > 0 && (
            <button
              onClick={exportCloseHistory}
              className="px-3 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("reports.exportCloseHistory")}
            </button>
          )}
        </div>
      </div>

      {/* Close History Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded h-10 w-full" />
            ))}
          </div>
        ) : closes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">{t("reports.noCloseHistory")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("reports.date")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("reports.orderCount")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("reports.totalRevenue")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("reports.expectedCash")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("reports.actualCash")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("reports.variance")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("reports.cardTotal")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("reports.closedBy")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {closes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{c.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{c.orderCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatMoney(c.totalRevenue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatMoney(c.expectedCash)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatMoney(c.actualCash)}</td>
                    <td className={`px-4 py-3 text-sm font-medium text-right ${
                      c.variance === 0 ? "text-green-600" : c.variance > 0 ? "text-blue-600" : "text-red-600"
                    }`}>
                      {c.variance > 0 ? "+" : ""}{formatMoney(c.variance)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatMoney(c.cardTotal)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{c.closedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Close Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">{t("reports.closeToday")}</h3>

            <div className="space-y-4">
              {/* Expected Cash */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t("reports.expectedCash")}</span>
                  <span className="text-lg font-bold text-gray-900">{formatMoney(expectedCash)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">{t("reports.cardTotal")}</span>
                  <span className="text-sm font-medium text-gray-700">{formatMoney(cardTotal)}</span>
                </div>
              </div>

              {/* Actual Cash Input */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("reports.actualCash")}</label>
                <input
                  type="number"
                  step="0.01"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-lg font-mono focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              {/* Variance */}
              {actualCash && (
                <div className={`rounded-lg p-4 ${
                  Math.abs(variance) < 0.01 ? "bg-green-50" : variance > 0 ? "bg-blue-50" : "bg-red-50"
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t("reports.variance")}</span>
                    <span className={`text-lg font-bold ${
                      Math.abs(variance) < 0.01 ? "text-green-600" : variance > 0 ? "text-blue-600" : "text-red-600"
                    }`}>
                      {variance > 0 ? "+" : ""}{formatMoney(variance)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("reports.closeNotes")}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  rows={2}
                  placeholder=""
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleClose}
                  disabled={!actualCash || submitting}
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? t("common.loading") : t("reports.confirmClose")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
