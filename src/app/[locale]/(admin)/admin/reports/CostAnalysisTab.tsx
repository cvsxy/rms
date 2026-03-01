"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { downloadCSV, formatMoney, formatPercent } from "./csvExport";

interface CategoryMargin {
  name: string;
  nameEs: string;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
}

interface ItemProfit {
  name: string;
  nameEs: string;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
  quantitySold: number;
}

interface CostAnalysis {
  totalFoodCost: number;
  totalItemRevenue: number;
  grossProfit: number;
  foodCostPercent: number;
  categoryMargins: CategoryMargin[];
  topItemsByProfit: ItemProfit[];
}

interface CostAnalysisTabProps {
  costAnalysis: CostAnalysis;
  fromDate: string;
  toDate: string;
}

const TOOLTIP_STYLE = {
  borderRadius: 8,
  fontSize: 13,
  border: "1px solid #e5e7eb",
};

function costPercentColor(pct: number): string {
  if (pct <= 30) return "text-green-600";
  if (pct <= 35) return "text-yellow-600";
  return "text-red-600";
}

function costPercentBg(pct: number): string {
  if (pct <= 30) return "bg-green-50";
  if (pct <= 35) return "bg-yellow-50";
  return "bg-red-50";
}

function marginBadge(pct: number): string {
  if (pct >= 70) return "bg-green-100 text-green-800";
  if (pct >= 65) return "bg-green-50 text-green-700";
  if (pct >= 50) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export default function CostAnalysisTab({ costAnalysis, fromDate, toDate }: CostAnalysisTabProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isEs = locale === "es";

  const { totalFoodCost, totalItemRevenue, grossProfit, foodCostPercent, categoryMargins, topItemsByProfit } = costAnalysis;

  const chartData = topItemsByProfit.map((item) => ({
    name: isEs ? item.nameEs : item.name,
    profit: item.profit,
    cost: item.cost,
  }));

  function exportPnl() {
    const lines: string[] = [];
    lines.push(`Profit & Loss Report,${fromDate} to ${toDate}`);
    lines.push("");
    lines.push("P&L Summary");
    lines.push(`Total Item Revenue,${formatMoney(totalItemRevenue)}`);
    lines.push(`Total Food Cost,${formatMoney(totalFoodCost)}`);
    lines.push(`Gross Profit,${formatMoney(grossProfit)}`);
    lines.push(`Food Cost %,${formatPercent(foodCostPercent)}`);
    lines.push("");
    lines.push("Category Margins");
    lines.push("Category,Revenue,Food Cost,Profit,Margin %");
    for (const c of categoryMargins) {
      lines.push(
        `${isEs ? c.nameEs : c.name},${formatMoney(c.revenue)},${formatMoney(c.cost)},${formatMoney(c.profit)},${formatPercent(c.marginPercent)}`
      );
    }
    lines.push("");
    lines.push("Top Items by Profit");
    lines.push("Item,Qty Sold,Revenue,Food Cost,Profit,Margin %");
    for (const item of topItemsByProfit) {
      lines.push(
        `${isEs ? item.nameEs : item.name},${item.quantitySold},${formatMoney(item.revenue)},${formatMoney(item.cost)},${formatMoney(item.profit)},${formatPercent(item.marginPercent)}`
      );
    }
    downloadCSV(`rms-pnl-${fromDate}-to-${toDate}.csv`, lines);
  }

  return (
    <div className="space-y-6">
      {/* P&L Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{t("reports.pnlSummary")}</h2>
        <button
          onClick={exportPnl}
          className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t("reports.exportPnl")}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">{t("reports.revenue")}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{formatMoney(totalItemRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">{t("reports.totalFoodCost")}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{formatMoney(totalFoodCost)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">{t("reports.grossProfit")}</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{formatMoney(grossProfit)}</p>
        </div>
        <div className={`rounded-xl border border-gray-200 p-5 ${costPercentBg(foodCostPercent)}`}>
          <p className="text-sm text-gray-500">{t("reports.foodCostPercent")}</p>
          <p className={`text-2xl font-semibold mt-1 ${costPercentColor(foodCostPercent)}`}>
            {formatPercent(foodCostPercent)}
          </p>
        </div>
      </div>

      {/* Category Margins */}
      {categoryMargins.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("reports.categoryMargins")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("menu.categories")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("reports.revenue")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("reports.cost")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("reports.profit")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("reports.margin")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categoryMargins.map((cat) => (
                  <tr key={cat.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {isEs ? cat.nameEs : cat.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatMoney(cat.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatMoney(cat.cost)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatMoney(cat.profit)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${marginBadge(cat.marginPercent)}`}>
                        {formatPercent(cat.marginPercent)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Items by Profit */}
      {topItemsByProfit.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("reports.itemMargins")}</h2>

          {/* Chart */}
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 40)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} width={90} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((value: number | undefined, name: string) => [
                    `$${Number(value ?? 0).toFixed(2)}`,
                    name === "profit" ? (isEs ? "Utilidad" : "Profit") : (isEs ? "Costo" : "Cost"),
                  ]) as any}
                />
                <Bar dataKey="profit" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="cost" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("menu.title")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("reports.quantitySold")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("reports.revenue")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("reports.cost")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("reports.profit")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("reports.margin")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topItemsByProfit.map((item) => (
                  <tr key={item.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {isEs ? item.nameEs : item.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.quantitySold}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatMoney(item.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatMoney(item.cost)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatMoney(item.profit)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${marginBadge(item.marginPercent)}`}>
                        {formatPercent(item.marginPercent)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
