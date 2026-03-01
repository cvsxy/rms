"use client";

import { useLocale } from "next-intl";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const TOOLTIP_STYLE = {
  borderRadius: 6,
  fontSize: 12,
  border: "none",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
};

const AXIS_TICK = { fontSize: 12, fill: "#6b7280" };

interface ReportsChartsProps {
  revenueByDay: { date: string; revenue: number; orders: number }[];
  ordersByHour: { hour: number; orders: number; revenue: number }[];
  topItems: { name: string; nameEs: string; quantity: number; revenue: number }[];
  categoryBreakdown: {
    name: string;
    nameEs: string;
    revenue: number;
    itemCount: number;
  }[];
  paymentMethods: { method: string; count: number; total: number }[];
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-5 shadow-sm">
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-gray-400">
      {message}
    </div>
  );
}

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const RADIAN = Math.PI / 180;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

// Recharts Formatter types expect `value` to potentially be `undefined`.
// We use a helper to build typed formatters without fighting the library generics.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFormatter = any;

export default function ReportsCharts({
  revenueByDay,
  ordersByHour,
  topItems,
  categoryBreakdown,
  paymentMethods,
}: ReportsChartsProps) {
  const locale = useLocale();
  const isEs = locale === "es";

  // Localize names for items and categories
  const localizedTopItems = topItems.map((item) => ({
    ...item,
    displayName: isEs ? item.nameEs : item.name,
  }));

  const localizedCategories = categoryBreakdown.map((cat) => ({
    ...cat,
    displayName: isEs ? cat.nameEs : cat.name,
  }));

  const localizedPayments = paymentMethods.map((pm) => ({
    ...pm,
    displayName:
      pm.method === "CASH"
        ? isEs
          ? "Efectivo"
          : "Cash"
        : isEs
          ? "Tarjeta"
          : "Card",
  }));

  // ── Tooltip formatters ─────────────────────────────────────────
  const revenueFormatter: AnyFormatter = (
    value: number | undefined,
    name: string
  ) => [
    formatCurrency(Number(value ?? 0)),
    name === "revenue"
      ? isEs
        ? "Ingresos"
        : "Revenue"
      : isEs
        ? "Ordenes"
        : "Orders",
  ];

  const hourFormatter: AnyFormatter = (
    value: number | undefined,
    name: string
  ) => [
    name === "orders"
      ? Number(value ?? 0)
      : formatCurrency(Number(value ?? 0)),
    name === "orders"
      ? isEs
        ? "Ordenes"
        : "Orders"
      : isEs
        ? "Ingresos"
        : "Revenue",
  ];

  const currencyOnlyFormatter: AnyFormatter = (value: number | undefined) => [
    formatCurrency(Number(value ?? 0)),
    isEs ? "Ingresos" : "Revenue",
  ];

  const paymentFormatter: AnyFormatter = (value: number | undefined) => [
    formatCurrency(Number(value ?? 0)),
    "Total",
  ];

  const topItemsFormatter: AnyFormatter = (
    value: number | undefined,
    name: string
  ) => [
    name === "quantity"
      ? Number(value ?? 0)
      : formatCurrency(Number(value ?? 0)),
    name === "quantity"
      ? isEs
        ? "Cantidad"
        : "Quantity"
      : isEs
        ? "Ingresos"
        : "Revenue",
  ];

  return (
    <div className="space-y-6">
      {/* Revenue Over Time */}
      <ChartCard title={isEs ? "Ingresos por Dia" : "Revenue Over Time"}>
        {revenueByDay.length === 0 ? (
          <EmptyState message={isEs ? "Sin datos" : "No data available"} />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={revenueByDay}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => {
                  const parts = String(val).split("-");
                  return `${parts[1]}/${parts[2]}`;
                }}
              />
              <YAxis
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={revenueFormatter}
                labelFormatter={(label) => String(label)}
              />
              <Legend
                formatter={(value) =>
                  value === "revenue"
                    ? isEs
                      ? "Ingresos"
                      : "Revenue"
                    : isEs
                      ? "Ordenes"
                      : "Orders"
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Orders by Hour */}
      <ChartCard title={isEs ? "Ordenes por Hora" : "Orders by Hour"}>
        {ordersByHour.every((h) => h.orders === 0) ? (
          <EmptyState message={isEs ? "Sin datos" : "No data available"} />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={ordersByHour}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="hour"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => formatHour(Number(val))}
              />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(label) => formatHour(Number(label))}
                formatter={hourFormatter}
              />
              <Legend
                formatter={(value) =>
                  value === "orders"
                    ? isEs
                      ? "Ordenes"
                      : "Orders"
                    : isEs
                      ? "Ingresos"
                      : "Revenue"
                }
              />
              <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <ChartCard
          title={isEs ? "Desglose por Categoria" : "Category Breakdown"}
        >
          {localizedCategories.length === 0 ? (
            <EmptyState
              message={isEs ? "Sin datos" : "No data available"}
            />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={localizedCategories}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="revenue"
                  nameKey="displayName"
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {localizedCategories.map((_, index) => (
                    <Cell
                      key={`cat-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={currencyOnlyFormatter}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Payment Methods */}
        <ChartCard title={isEs ? "Metodos de Pago" : "Payment Methods"}>
          {localizedPayments.length === 0 ? (
            <EmptyState
              message={isEs ? "Sin datos" : "No data available"}
            />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={localizedPayments}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="total"
                  nameKey="displayName"
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {localizedPayments.map((_, index) => (
                    <Cell
                      key={`pay-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={paymentFormatter}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top 10 Items */}
      <ChartCard title={isEs ? "Top 10 Articulos" : "Top 10 Items"}>
        {localizedTopItems.length === 0 ? (
          <EmptyState message={isEs ? "Sin datos" : "No data available"} />
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(300, localizedTopItems.length * 40)}
          >
            <BarChart
              data={localizedTopItems}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="displayName"
                tick={AXIS_TICK}
                width={90}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={topItemsFormatter}
              />
              <Legend
                formatter={(value) =>
                  value === "quantity"
                    ? isEs
                      ? "Cantidad"
                      : "Quantity"
                    : isEs
                      ? "Ingresos"
                      : "Revenue"
                }
              />
              <Bar
                dataKey="quantity"
                fill="#6366f1"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="revenue"
                fill="#f59e0b"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
