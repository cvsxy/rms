"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { downloadCSV, formatMoney } from "./csvExport";

interface TaxDay {
  date: string;
  subtotal: number;
  tax: number;
  discount: number;
  tips: number;
  total: number;
  orderCount: number;
}

interface TaxMonthly {
  subtotal: number;
  tax: number;
  discount: number;
  tips: number;
  total: number;
  orderCount: number;
}

interface TaxRevenueTabProps {
  taxBreakdown: {
    daily: TaxDay[];
    monthly: TaxMonthly;
  };
  fromDate: string;
  toDate: string;
}

type SortKey = "date" | "orderCount" | "subtotal" | "discount" | "tax" | "tips" | "total";
type SortDir = "asc" | "desc";

export default function TaxRevenueTab({ taxBreakdown, fromDate, toDate }: TaxRevenueTabProps) {
  const t = useTranslations();
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { daily, monthly } = taxBreakdown;

  const sorted = [...daily].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "asc" : "desc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-gray-400">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>;
  }

  function exportDailyTax() {
    const lines: string[] = [];
    lines.push(`Daily Tax Report,${fromDate} to ${toDate}`);
    lines.push("");
    lines.push("Date,Orders,Subtotal,Discount,IVA (16%),Tips,Total");
    for (const d of daily) {
      lines.push(
        `${d.date},${d.orderCount},${formatMoney(d.subtotal)},${formatMoney(d.discount)},${formatMoney(d.tax)},${formatMoney(d.tips)},${formatMoney(d.total)}`
      );
    }
    lines.push("");
    lines.push(
      `TOTALS,${monthly.orderCount},${formatMoney(monthly.subtotal)},${formatMoney(monthly.discount)},${formatMoney(monthly.tax)},${formatMoney(monthly.tips)},${formatMoney(monthly.total)}`
    );
    downloadCSV(`rms-tax-daily-${fromDate}-to-${toDate}.csv`, lines);
  }

  function exportMonthlySummary() {
    const lines: string[] = [];
    lines.push(`Tax Summary,${fromDate} to ${toDate}`);
    lines.push("");
    lines.push("Metric,Amount");
    lines.push(`Orders,${monthly.orderCount}`);
    lines.push(`Subtotal (before tax),${formatMoney(monthly.subtotal)}`);
    lines.push(`Discounts,${formatMoney(monthly.discount)}`);
    lines.push(`IVA (16%),${formatMoney(monthly.tax)}`);
    lines.push(`Tips,${formatMoney(monthly.tips)}`);
    lines.push(`Total Revenue,${formatMoney(monthly.total)}`);
    downloadCSV(`rms-tax-summary-${fromDate}-to-${toDate}.csv`, lines);
  }

  return (
    <div className="space-y-6">
      {/* Period Summary Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t("reports.monthlySummary")}</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={exportDailyTax}
              className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("reports.exportDailyTax")}
            </button>
            <button
              onClick={exportMonthlySummary}
              className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("reports.exportMonthlySummary")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">{t("reports.orderCount")}</p>
            <p className="text-xl font-bold text-gray-900">{monthly.orderCount}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 mb-1">{t("reports.subtotal")}</p>
            <p className="text-xl font-bold text-blue-700">{formatMoney(monthly.subtotal)}</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600 mb-1">{t("reports.discounts")}</p>
            <p className="text-xl font-bold text-orange-700">{formatMoney(monthly.discount)}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600 mb-1">{t("reports.iva")}</p>
            <p className="text-xl font-bold text-red-700">{formatMoney(monthly.tax)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 mb-1">{t("reports.tips")}</p>
            <p className="text-xl font-bold text-green-700">{formatMoney(monthly.tips)}</p>
          </div>
          <div className="text-center p-3 bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-300 mb-1">{t("reports.total")}</p>
            <p className="text-xl font-bold text-white">{formatMoney(monthly.total)}</p>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("reports.dailyBreakdown")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {(
                  [
                    { key: "date" as SortKey, label: t("reports.date"), align: "left" },
                    { key: "orderCount" as SortKey, label: t("reports.orderCount"), align: "right" },
                    { key: "subtotal" as SortKey, label: t("reports.subtotal"), align: "right" },
                    { key: "discount" as SortKey, label: t("reports.discounts"), align: "right" },
                    { key: "tax" as SortKey, label: t("reports.iva"), align: "right" },
                    { key: "tips" as SortKey, label: t("reports.tips"), align: "right" },
                    { key: "total" as SortKey, label: t("reports.total"), align: "right" },
                  ] as const
                ).map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {col.label}
                    {sortIndicator(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((d) => (
                <tr key={d.date} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{d.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{d.orderCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatMoney(d.subtotal)}</td>
                  <td className="px-4 py-3 text-sm text-orange-600 text-right">
                    {d.discount > 0 ? `-${formatMoney(d.discount)}` : formatMoney(0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 text-right">{formatMoney(d.tax)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 text-right">{formatMoney(d.tips)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatMoney(d.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="px-4 py-3 text-sm font-bold text-gray-900">{t("reports.periodTotals")}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{monthly.orderCount}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatMoney(monthly.subtotal)}</td>
                <td className="px-4 py-3 text-sm font-bold text-orange-700 text-right">
                  {monthly.discount > 0 ? `-${formatMoney(monthly.discount)}` : formatMoney(0)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-red-700 text-right">{formatMoney(monthly.tax)}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-700 text-right">{formatMoney(monthly.tips)}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatMoney(monthly.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
