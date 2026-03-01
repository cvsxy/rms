"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { downloadCSV, formatMoney } from "./csvExport";

interface ServerData {
  id: string;
  name: string;
  orders: number;
  revenue: number;
  avgOrder: number;
  itemsPerOrder: number;
  tips: number;
}

interface ServerPerformanceTabProps {
  serverPerformance: ServerData[];
  fromDate: string;
  toDate: string;
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const TOOLTIP_STYLE = {
  borderRadius: 8,
  fontSize: 13,
  border: "1px solid #e5e7eb",
};

const RADIAN = Math.PI / 180;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="#374151" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12}>
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

type SortKey = "name" | "orders" | "revenue" | "avgOrder" | "itemsPerOrder" | "tips";
type SortDir = "asc" | "desc";

export default function ServerPerformanceTab({ serverPerformance, fromDate, toDate }: ServerPerformanceTabProps) {
  const t = useTranslations();
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = [...serverPerformance].sort((a, b) => {
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
      setSortDir("desc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-gray-400">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>;
  }

  function exportServers() {
    const lines: string[] = [];
    lines.push(`Server Performance Report,${fromDate} to ${toDate}`);
    lines.push("");
    lines.push("Name,Orders,Revenue,Avg Order,Items/Order,Tips");
    for (const s of serverPerformance) {
      lines.push(
        `${s.name},${s.orders},${formatMoney(s.revenue)},${formatMoney(s.avgOrder)},${s.itemsPerOrder.toFixed(1)},${formatMoney(s.tips)}`
      );
    }
    downloadCSV(`rms-servers-${fromDate}-to-${toDate}.csv`, lines);
  }

  const pieData = serverPerformance.map((s) => ({
    name: s.name,
    value: s.revenue,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{t("reports.serverPerformance")}</h2>
        <button
          onClick={exportServers}
          className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t("reports.exportServers")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Share Pie */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("reports.revenueShare")}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`srv-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((value: number | undefined) => [formatMoney(Number(value ?? 0)), "Revenue"]) as any}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Performance Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {(
                    [
                      { key: "name" as SortKey, label: t("admin.serverName"), align: "left" },
                      { key: "orders" as SortKey, label: t("reports.orderCount"), align: "right" },
                      { key: "revenue" as SortKey, label: t("reports.revenue"), align: "right" },
                      { key: "avgOrder" as SortKey, label: t("reports.avgOrderValue"), align: "right" },
                      { key: "itemsPerOrder" as SortKey, label: t("reports.itemsPerOrder"), align: "right" },
                      { key: "tips" as SortKey, label: t("reports.tipsEarned"), align: "right" },
                    ] as const
                  ).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap ${
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
                {sorted.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-right">{s.orders}</td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 text-right">{formatMoney(s.revenue)}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-right">{formatMoney(s.avgOrder)}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-right">{s.itemsPerOrder.toFixed(1)}</td>
                    <td className="px-3 py-3 text-sm text-green-600 text-right font-medium">{formatMoney(s.tips)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
