"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  const hasRevenue = revenueByDay.some((d) => d.revenue > 0);
  const hasOrders = ordersByHour.some((d) => d.orders > 0);
  const hasItems = topItems.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 7-Day Revenue */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Ingresos (7 dias)
        </h3>
        {hasRevenue ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, "Ingresos"]}
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
              />
              <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
            Sin datos de ingresos
          </div>
        )}
      </div>

      {/* Orders by Hour */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Ordenes por Hora (Hoy)
        </h3>
        {hasOrders ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ordersByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={1} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [value, "Ordenes"]}
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
              />
              <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
            Sin ordenes hoy
          </div>
        )}
      </div>

      {/* Top 5 Items */}
      {hasItems && (
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Top Articulos
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topItems} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12 }}
                width={120}
              />
              <Tooltip
                formatter={(value) => [value, "Vendidos"]}
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
              />
              <Bar dataKey="quantity" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
