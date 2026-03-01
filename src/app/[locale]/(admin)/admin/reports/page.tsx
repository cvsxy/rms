"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import OverviewTab from "./OverviewTab";
import TaxRevenueTab from "./TaxRevenueTab";
import CostAnalysisTab from "./CostAnalysisTab";
import ServerPerformanceTab from "./ServerPerformanceTab";
import DailyCloseTab from "./DailyCloseTab";

// --- Types ---

type Preset = "today" | "yesterday" | "week" | "month" | "custom";
type Tab = "overview" | "tax" | "cost" | "servers" | "dailyClose";

interface ReportSummary {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  cashTotal: number;
  cardTotal: number;
  itemsSold: number;
  tipTotal: number;
}

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

interface CostAnalysis {
  totalFoodCost: number;
  totalItemRevenue: number;
  grossProfit: number;
  foodCostPercent: number;
  categoryMargins: {
    name: string;
    nameEs: string;
    revenue: number;
    cost: number;
    profit: number;
    marginPercent: number;
  }[];
  topItemsByProfit: {
    name: string;
    nameEs: string;
    revenue: number;
    cost: number;
    profit: number;
    marginPercent: number;
    quantitySold: number;
  }[];
}

interface ReportData {
  summary: ReportSummary;
  revenueByDay: { date: string; revenue: number; orders: number }[];
  ordersByHour: { hour: number; orders: number; revenue: number }[];
  topItems: { name: string; nameEs: string; quantity: number; revenue: number }[];
  categoryBreakdown: { name: string; nameEs: string; revenue: number; itemCount: number }[];
  serverPerformance: {
    id: string;
    name: string;
    orders: number;
    revenue: number;
    avgOrder: number;
    itemsPerOrder: number;
    tips: number;
  }[];
  paymentMethods: { method: string; count: number; total: number }[];
  taxBreakdown: {
    daily: TaxDay[];
    monthly: TaxMonthly;
  };
  costAnalysis: CostAnalysis;
}

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-lg border border-gray-200 p-5">
            <div className="bg-gray-200 rounded h-4 w-24 mb-3" />
            <div className="bg-gray-200 rounded h-7 w-32" />
          </div>
        ))}
      </div>
      <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-6">
        <div className="bg-gray-200 rounded h-5 w-40 mb-4" />
        <div className="bg-gray-200 rounded h-48 w-full" />
      </div>
    </div>
  );
}

// --- Main Component ---

export default function ReportsPage() {
  const t = useTranslations();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Date range state
  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState(() => formatDate(new Date()));
  const [customTo, setCustomTo] = useState(() => formatDate(new Date()));

  // Data state
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute from/to from preset
  const { from, to } = useMemo(
    () => getDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const fromDate = formatDate(from);
  const toDate = formatDate(to);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reports?from=${from.toISOString()}&to=${to.toISOString()}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  // Tabs definition
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: t("reports.tabOverview") },
    { key: "tax", label: t("reports.tabTax") },
    { key: "cost", label: t("reports.tabCost") },
    { key: "servers", label: t("reports.tabServers") },
    { key: "dailyClose", label: t("reports.tabDailyClose") },
  ];

  // Preset buttons
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{t("reports.title")}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {presets.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preset === key
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range inputs */}
      {preset === "custom" && (
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t("reports.from")}</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
          />
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t("reports.to")}</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-200">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <ReportsSkeleton />
      ) : error ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-red-500">
          {error}
        </div>
      ) : activeTab === "dailyClose" ? (
        /* Daily Close has its own data fetching */
        <DailyCloseTab fromDate={fromDate} toDate={toDate} />
      ) : !hasData ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          {t("reports.noDataForPeriod")}
        </div>
      ) : (
        <>
          {activeTab === "overview" && data && (
            <OverviewTab
              summary={data.summary}
              revenueByDay={data.revenueByDay}
              ordersByHour={data.ordersByHour}
              topItems={data.topItems}
              categoryBreakdown={data.categoryBreakdown}
              paymentMethods={data.paymentMethods}
              serverPerformance={data.serverPerformance}
              fromDate={fromDate}
              toDate={toDate}
            />
          )}
          {activeTab === "tax" && data && (
            <TaxRevenueTab
              taxBreakdown={data.taxBreakdown}
              fromDate={fromDate}
              toDate={toDate}
            />
          )}
          {activeTab === "cost" && data && (
            <CostAnalysisTab
              costAnalysis={data.costAnalysis}
              fromDate={fromDate}
              toDate={toDate}
            />
          )}
          {activeTab === "servers" && data && (
            <ServerPerformanceTab
              serverPerformance={data.serverPerformance}
              fromDate={fromDate}
              toDate={toDate}
            />
          )}
        </>
      )}
    </div>
  );
}
