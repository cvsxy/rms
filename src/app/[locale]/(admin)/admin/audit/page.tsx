"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";

interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  orderId: string | null;
  orderItemId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; role: string };
}

const ACTIONS = [
  "ITEM_VOIDED",
  "ORDER_CANCELLED",
  "PAYMENT_PROCESSED",
  "DISCOUNT_APPLIED",
  "ITEM_86D",
  "STOCK_ADJUSTED",
];

export default function AuditPage() {
  const t = useTranslations();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [serverFilter, setServerFilter] = useState("");
  const [servers, setServers] = useState<{ id: string; name: string }[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/servers")
      .then((r) => r.json())
      .then((j) => setServers(j.data || []));
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (actionFilter) params.set("action", actionFilter);
    if (serverFilter) params.set("userId", serverFilter);
    if (dateFrom) params.set("from", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      params.set("to", end.toISOString());
    }

    try {
      const res = await fetch(`/api/audit?${params}`);
      const json = await res.json();
      setEntries(json.data || []);
      setTotal(json.total || 0);
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, serverFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, serverFilter, dateFrom, dateTo]);

  const actionLabels: Record<string, string> = {
    ITEM_VOIDED: t("audit.itemVoided"),
    ORDER_CANCELLED: t("audit.orderCancelled"),
    PAYMENT_PROCESSED: t("audit.paymentProcessed"),
    DISCOUNT_APPLIED: t("audit.discountApplied"),
    ITEM_86D: t("audit.item86d"),
    STOCK_ADJUSTED: t("audit.stockAdjusted"),
  };

  const actionColors: Record<string, string> = {
    ITEM_VOIDED: "bg-red-100 text-red-700",
    ORDER_CANCELLED: "bg-red-100 text-red-700",
    PAYMENT_PROCESSED: "bg-green-100 text-green-700",
    DISCOUNT_APPLIED: "bg-purple-100 text-purple-700",
    ITEM_86D: "bg-orange-100 text-orange-700",
    STOCK_ADJUSTED: "bg-blue-100 text-blue-700",
  };

  function formatDetails(entry: AuditEntry): string {
    if (!entry.details) return "";
    const d = entry.details;
    switch (entry.action) {
      case "ITEM_VOIDED":
        return `${d.itemNameEs || d.itemName || ""}${d.voidReason ? ` — ${d.voidReason}` : ""}${d.voidNote ? ` (${d.voidNote})` : ""}`;
      case "PAYMENT_PROCESSED":
        return `${d.method} $${Number(d.total || 0).toFixed(2)}${Number(d.discount || 0) > 0 ? ` (-$${Number(d.discount).toFixed(2)})` : ""}`;
      case "DISCOUNT_APPLIED":
        return `${d.type === "PERCENTAGE" ? `${d.value}%` : `$${Number(d.value || 0).toFixed(2)}`}${d.note ? ` — ${d.note}` : ""}`;
      case "ITEM_86D":
        return `${d.itemName || ""} → ${d.available ? "available" : "86'd"}`;
      case "STOCK_ADJUSTED":
        return `${d.ingredientName || ""}: ${Number(d.adjustment) > 0 ? "+" : ""}${d.adjustment} → ${d.newStock}`;
      case "ORDER_CANCELLED":
        return d.reason ? String(d.reason) : "";
      default:
        return JSON.stringify(d);
    }
  }

  const totalPages = Math.ceil(total / 30);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("audit.title")}</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("audit.filterByAction")}</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">{t("audit.allActions")}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {actionLabels[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("audit.filterByServer")}</label>
          <select
            value={serverFilter}
            onChange={(e) => setServerFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">{t("audit.allServers")}</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("reports.from")}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("reports.to")}</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">{t("common.loading")}</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t("audit.noEntries")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">{t("audit.timestamp")}</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">{t("audit.action")}</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">{t("audit.user")}</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">{t("audit.details")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${actionColors[entry.action] || "bg-gray-100 text-gray-700"}`}>
                      {actionLabels[entry.action] || entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.user.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {formatDetails(entry)}
                    {expandedId === entry.id && entry.details && (
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-gray-500">
              {total} entries
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                &larr;
              </button>
              <span className="px-3 py-1 text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
