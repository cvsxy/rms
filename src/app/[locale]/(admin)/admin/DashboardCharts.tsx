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
} from "recharts";
import { useTranslations } from "next-intl";

interface DashboardChartsProps {
  revenueByDay: { date: string; revenue: number }[];
  ordersByHour: { hour: string; orders: number }[];
  topItems: { name: string; quantity: number }[];
}

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 7-Day Revenue - Area Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          {t("reports.revenueOverTime")}
        </h3>
        {hasRevenue ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueByDay}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, t("reports.revenue")]}
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 13,
                  border: "1px solid #e5e7eb",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
            {t("reports.noDataForPeriod")}
          </div>
        )}
      </div>

      {/* Orders by Hour - Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          {t("reports.ordersByHour")}
        </h3>
        {hasOrders ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ordersByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                interval={1}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value) => [value, t("reports.orderCount")]}
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 13,
                  border: "1px solid #e5e7eb",
                }}
              />
              <Bar
                dataKey="orders"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
            {t("reports.noDataForPeriod")}
          </div>
        )}
      </div>

      {/* Top 5 Items - Horizontal Bar Chart */}
      {hasItems && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {t("reports.topItems")}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topItems} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                allowDecimals={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                width={120}
              />
              <Tooltip
                formatter={(value) => [value, t("reports.itemsSold")]}
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 13,
                  border: "1px solid #e5e7eb",
                }}
              />
              <Bar
                dataKey="quantity"
                fill="#8b5cf6"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
