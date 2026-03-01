"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTranslations } from "next-intl";

interface DashboardChartsProps {
  revenueByDay: { date: string; revenue: number }[];
  ordersByHour: { hour: string; orders: number }[];
  topItems: { name: string; quantity: number }[];
}

const TOOLTIP_STYLE = {
  borderRadius: 6,
  fontSize: 12,
  border: "none",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
};

const TOP_ITEM_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9"];

export default function DashboardCharts({
  revenueByDay,
  ordersByHour,
  topItems,
}: DashboardChartsProps) {
  const t = useTranslations();
  const hasRevenue = revenueByDay.some((d) => d.revenue > 0);
  const hasOrders = ordersByHour.some((d) => d.orders > 0);
  const hasItems = topItems.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 7-Day Revenue - Area Chart */}
      <div className="admin-card p-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
          {t("reports.revenueOverTime")}
        </h3>
        {hasRevenue ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueByDay}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(v) => `$${v}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, t("reports.revenue")]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
            {t("reports.noDataForPeriod")}
          </div>
        )}
      </div>

      {/* Orders by Hour - Bar Chart */}
      <div className="admin-card p-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
          {t("reports.ordersByHour")}
        </h3>
        {hasOrders ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ordersByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                interval={1}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [value, t("reports.orderCount")]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar
                dataKey="orders"
                fill="#6366f1"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
            {t("reports.noDataForPeriod")}
          </div>
        )}
      </div>

      {/* Top 5 Items - Horizontal Bar Chart */}
      {hasItems && (
        <div className="admin-card p-5 lg:col-span-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
            {t("reports.topItems")}
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topItems} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                width={120}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [value, t("reports.itemsSold")]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="quantity" radius={[0, 3, 3, 0]}>
                {topItems.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={TOP_ITEM_COLORS[index % TOP_ITEM_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
