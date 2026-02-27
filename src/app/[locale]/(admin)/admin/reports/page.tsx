"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import ReportsCharts from "./ReportsCharts";

// --- Types ---

type Preset = "today" | "yesterday" | "week" | "month" | "custom";

interface ReportSummary {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  cashTotal: number;
  cardTotal: number;
  itemsSold: number;
  tipTotal: number;
}

interface RevenueByDay {
  date: string;
  revenue: number;
  orders: number;
}

interface OrdersByHour {
  hour: number;
  orders: number;
  revenue: number;
}

interface TopItem {
  name: string;
  nameEs: string;
  quantity: number;
  revenue: number;
}

interface CategoryBreakdown {
  name: string;
  nameEs: string;
  revenue: number;
  itemCount: number;
}

interface ServerPerformance {
  id: string;
  name: string;
  orders: number;
  revenue: number;
  avgOrder: number;
  itemsPerOrder: number;
}

interface PaymentMethod {
  method: string;
  count: number;
  total: number;
}

interface ReportData {
  summary: ReportSummary;
  revenueByDay: RevenueByDay[];
  ordersByHour: OrdersByHour[];
  topItems: TopItem[];
  categoryBreakdown: CategoryBreakdown[];
  serverPerformance: ServerPerformance[];
  paymentMethods: PaymentMethod[];
}

type SortKey = "name" | "orders" | "revenue" | "avgOrder" | "itemsPerOrder";
type SortDir = "asc" | "desc";

// --- Helpers ---

function getDateRange(preset: Preset, customFrom: string, customTo: string): { from: Date; to: Date } {
  const now = new Date();

  switch (preset) {
    case "today": {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { from, to };
    }
    case "yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      return { from, to };
    }
    case "week": {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const from = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0);
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { from, to };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { from, to };
    }
    case "custom": {
      const from = customFrom
        ? new Date(customFrom + "T00:00:00")
        : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const to = customTo
        ? new Date(customTo + "T23:59:59")
        : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { from, to };
    }
  }
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// --- Skeleton ---

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
            <div className="bg-gray-200 rounded h-4 w-24 mb-3" />
            <div className="bg-gray-200 rounded h-7 w-32" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="animate-pulse bg-white rounded-xl border border-gray-200 p-6">
        <div className="bg-gray-200 rounded h-5 w-40 mb-4" />
        <div className="bg-gray-200 rounded h-48 w-full" />
      </div>
      {/* Table skeleton */}
      <div className="animate-pulse bg-white rounded-xl border border-gray-200 p-6">
        <div className="bg-gray-200 rounded h-5 w-48 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function ReportsPage() {
  const t = useTranslations();

  // Date range state
  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState(() => formatDate(new Date()));
  const [customTo, setCustomTo] = useState(() => formatDate(new Date()));

  // Data state
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server performance sort state
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Compute from/to from preset
  const { from, to } = useMemo(
    () => getDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/reports?from=${from.toISOString()}&to=${to.toISOString()}`
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json.data);
    } catch {
      setError(t("common.error"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sorted server performance
  const sortedServers = useMemo(() => {
    if (!data?.serverPerformance) return [];
    const sorted = [...data.serverPerformance];
    sorted.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [data?.serverPerformance, sortKey, sortDir]);

  // Toggle sort on column header click
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Sort indicator
  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return (
      <span className="ml-1 text-gray-400">
        {sortDir === "asc" ? "\u2191" : "\u2193"}
      </span>
    );
  }

  // CSV export
  function exportCSV() {
    if (!data) return;

    const { summary, serverPerformance } = data;
    const fromStr = formatDate(from);
    const toStr = formatDate(to);

    const lines: string[] = [];

    // Summary section
    lines.push("Report Summary");
    lines.push(`Period,${fromStr} to ${toStr}`);
    lines.push(`Total Revenue,$${summary.totalRevenue.toFixed(2)}`);
    lines.push(`Orders,${summary.orderCount}`);
    lines.push(`Avg Order Value,$${summary.avgOrderValue.toFixed(2)}`);
    lines.push(`Total Tips,$${summary.tipTotal.toFixed(2)}`);
    lines.push("");

    // Server breakdown
    if (serverPerformance.length > 0) {
      lines.push("Server Performance");
      lines.push("Name,Orders,Revenue,Avg Order,Items/Order");
      for (const s of serverPerformance) {
        lines.push(
          `${s.name},${s.orders},$${s.revenue.toFixed(2)},$${s.avgOrder.toFixed(2)},${s.itemsPerOrder.toFixed(1)}`
        );
      }
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rms-report-${fromStr}-to-${toStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Preset button styles
  const presets: { key: Preset; label: string }[] = [
    { key: "today", label: t("reports.today") },
    { key: "yesterday", label: t("reports.yesterday") },
    { key: "week", label: t("reports.thisWeek") },
    { key: "month", label: t("reports.thisMonth") },
    { key: "custom", label: t("reports.customRange") },
  ];

  const hasData = data && data.summary.orderCount > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("reports.title")}
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset buttons */}
          {presets.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preset === key
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}

          {/* CSV export button */}
          {!loading && hasData && (
            <button
              onClick={exportCSV}
              className="ml-2 px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {t("reports.exportCsv")}
            </button>
          )}
        </div>
      </div>

      {/* Custom date range inputs */}
      {preset === "custom" && (
        <div className="flex items-center gap-3 mb-6">
          <label className="text-sm text-gray-600">{t("reports.from")}</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
          />
          <label className="text-sm text-gray-600">{t("reports.to")}</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
          />
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <ReportsSkeleton />
      ) : error ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-red-500">
          {error}
        </div>
      ) : !hasData ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          {t("reports.noDataForPeriod")}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{t("reports.totalRevenue")}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                ${data.summary.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{t("reports.orderCount")}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {data.summary.orderCount}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{t("reports.avgOrderValue")}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                ${data.summary.avgOrderValue.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{t("reports.tipTotal")}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                ${data.summary.tipTotal.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Charts */}
          <ReportsCharts
            revenueByDay={data.revenueByDay}
            ordersByHour={data.ordersByHour}
            topItems={data.topItems}
            categoryBreakdown={data.categoryBreakdown}
            paymentMethods={data.paymentMethods}
          />

          {/* Server Performance Table */}
          {sortedServers.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("reports.serverPerformance")}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th
                        onClick={() => handleSort("name")}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                      >
                        {t("admin.serverName")}
                        {sortIndicator("name")}
                      </th>
                      <th
                        onClick={() => handleSort("orders")}
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                      >
                        {t("reports.orderCount")}
                        {sortIndicator("orders")}
                      </th>
                      <th
                        onClick={() => handleSort("revenue")}
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                      >
                        {t("reports.totalRevenue")}
                        {sortIndicator("revenue")}
                      </th>
                      <th
                        onClick={() => handleSort("avgOrder")}
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                      >
                        {t("reports.avgOrderValue")}
                        {sortIndicator("avgOrder")}
                      </th>
                      <th
                        onClick={() => handleSort("itemsPerOrder")}
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                      >
                        {t("reports.itemsPerOrder")}
                        {sortIndicator("itemsPerOrder")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedServers.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {s.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          {s.orders}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          ${s.revenue.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          ${s.avgOrder.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          {s.itemsPerOrder.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
