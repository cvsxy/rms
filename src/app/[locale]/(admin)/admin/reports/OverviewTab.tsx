"use client";

import { useTranslations } from "next-intl";
import ReportsCharts from "./ReportsCharts";
import { downloadCSV, formatMoney } from "./csvExport";

interface ReportSummary {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  cashTotal: number;
  cardTotal: number;
  itemsSold: number;
  tipTotal: number;
}

interface OverviewTabProps {
  summary: ReportSummary;
  revenueByDay: { date: string; revenue: number; orders: number }[];
  ordersByHour: { hour: number; orders: number; revenue: number }[];
  topItems: { name: string; nameEs: string; quantity: number; revenue: number }[];
  categoryBreakdown: { name: string; nameEs: string; revenue: number; itemCount: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
  serverPerformance: {
    id: string;
    name: string;
    orders: number;
    revenue: number;
    avgOrder: number;
    itemsPerOrder: number;
    tips: number;
  }[];
  fromDate: string;
  toDate: string;
}

export default function OverviewTab({
  summary,
  revenueByDay,
  ordersByHour,
  topItems,
  categoryBreakdown,
  paymentMethods,
  serverPerformance,
  fromDate,
  toDate,
}: OverviewTabProps) {
  const t = useTranslations();

  function exportCSV() {
    const lines: string[] = [];
    lines.push("Report Summary");
    lines.push(`Period,${fromDate} to ${toDate}`);
    lines.push(`Total Revenue,${formatMoney(summary.totalRevenue)}`);
    lines.push(`Orders,${summary.orderCount}`);
    lines.push(`Avg Order Value,${formatMoney(summary.avgOrderValue)}`);
    lines.push(`Cash Total,${formatMoney(summary.cashTotal)}`);
    lines.push(`Card Total,${formatMoney(summary.cardTotal)}`);
    lines.push(`Total Tips,${formatMoney(summary.tipTotal)}`);
    lines.push(`Items Sold,${summary.itemsSold}`);
    lines.push("");

    if (serverPerformance.length > 0) {
      lines.push("Server Performance");
      lines.push("Name,Orders,Revenue,Avg Order,Items/Order,Tips");
      for (const s of serverPerformance) {
        lines.push(
          `${s.name},${s.orders},${formatMoney(s.revenue)},${formatMoney(s.avgOrder)},${s.itemsPerOrder.toFixed(1)},${formatMoney(s.tips)}`
        );
      }
    }

    downloadCSV(`rms-overview-${fromDate}-to-${toDate}.csv`, lines);
  }

  const cards = [
    { label: t("reports.totalRevenue"), value: formatMoney(summary.totalRevenue) },
    { label: t("reports.orderCount"), value: summary.orderCount.toString() },
    { label: t("reports.avgOrderValue"), value: formatMoney(summary.avgOrderValue) },
    { label: t("reports.tipTotal"), value: formatMoney(summary.tipTotal) },
    { label: t("reports.cashTotal"), value: formatMoney(summary.cashTotal) },
    { label: t("reports.cardTotalLabel"), value: formatMoney(summary.cardTotal) },
    { label: t("reports.itemsSold"), value: summary.itemsSold.toString() },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t("reports.dailySummary")}</h2>
        <button
          onClick={exportCSV}
          className="px-3 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t("reports.exportCsv")}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <ReportsCharts
        revenueByDay={revenueByDay}
        ordersByHour={ordersByHour}
        topItems={topItems}
        categoryBreakdown={categoryBreakdown}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}
