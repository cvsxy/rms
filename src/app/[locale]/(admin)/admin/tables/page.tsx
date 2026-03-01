"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmModal from "@/components/common/ConfirmModal";
import { SkeletonCard } from "@/components/common/Skeleton";
import TableLayoutEditor from "./TableLayoutEditor";

interface Table {
  id: string;
  number: number;
  name: string;
  seats: number;
  status: string;
  isActive: boolean;
  posX: number | null;
  posY: number | null;
}

export default function ManageTablesPage() {
  const t = useTranslations();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formSeats, setFormSeats] = useState("4");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "layout">("list");
  const [customLayoutEnabled, setCustomLayoutEnabled] = useState(false);

  async function fetchTables() {
    const res = await fetch("/api/tables");
    if (res.ok) {
      const json = await res.json();
      setTables(json.data || json);
    }
    setLoading(false);
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const json = await res.json();
        setCustomLayoutEnabled(json.data?.useCustomLayout === "true");
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchTables();
    fetchSettings();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const url = editingId ? `/api/tables/${editingId}` : "/api/tables";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: parseInt(formNumber),
        name: formName,
        seats: parseInt(formSeats),
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setFormNumber("");
      setFormName("");
      setFormSeats("4");
      setEditingId(null);
      fetchTables();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/tables/${deleteTarget}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchTables();
  }

  function startEdit(table: Table) {
    setEditingId(table.id);
    setFormNumber(table.number.toString());
    setFormName(table.name);
    setFormSeats(table.seats.toString());
    setShowForm(true);
  }

  async function handleSaveLayout(positions: { id: string; posX: number; posY: number }[]) {
    await fetch("/api/tables/positions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positions }),
    });
    fetchTables();
  }

  async function toggleCustomLayout() {
    const newVal = !customLayoutEnabled;
    setCustomLayoutEnabled(newVal);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "useCustomLayout", value: String(newVal) }),
    });
  }

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800",
    OCCUPIED: "bg-red-100 text-red-800",
    RESERVED: "bg-yellow-100 text-yellow-800",
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {t("admin.manageTables")}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("tables.listView")}
            </button>
            <button
              onClick={() => setViewMode("layout")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === "layout"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("tables.layoutView")}
            </button>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setFormNumber((tables.length + 1).toString());
              setFormName("");
              setFormSeats("4");
              setShowForm(true);
            }}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            + {t("tables.createTable")}
          </button>
        </div>
      </div>

      {/* Custom layout toggle */}
      {viewMode === "layout" && (
        <div className="mb-4 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={customLayoutEnabled}
              onChange={toggleCustomLayout}
              className="w-4 h-4 text-gray-900 rounded border-gray-200 focus:ring-gray-400"
            />
            <span className="text-sm font-medium text-gray-700">
              {t("tables.enableCustomLayout")}
            </span>
          </label>
          {customLayoutEnabled && (
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
              {t("tables.customLayoutEnabled")}
            </span>
          )}
        </div>
      )}

      {/* Layout view */}
      {viewMode === "layout" ? (
        <TableLayoutEditor tables={tables} onSave={handleSaveLayout} />
      ) : (
        /* List view (original grid) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  {t("tables.tableNumber", { number: table.number })}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    statusColors[table.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {table.status === "AVAILABLE"
                    ? t("tables.available")
                    : table.status === "OCCUPIED"
                    ? t("tables.occupied")
                    : t("tables.reserved")}
                </span>
              </div>
              {table.name && (
                <p className="text-sm text-gray-500 mb-1">{table.name}</p>
              )}
              <p className="text-sm text-gray-500 mb-4">
                {t("tables.seats", { count: table.seats })}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(table)}
                  className="flex-1 text-sm font-medium py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t("common.edit")}
                </button>
                <button
                  onClick={() => setDeleteTarget(table.id)}
                  className="flex-1 text-sm font-medium py-2 bg-white text-red-600 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold mb-4">
              {editingId ? t("common.save") : t("tables.createTable")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("tables.tableNumber", { number: "" })} #
                </label>
                <input
                  type="number"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  required
                  min="1"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-gray-900"
                  placeholder="Interior 1, Terraza 2..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("tables.seats", { count: "" })}
                </label>
                <input
                  type="number"
                  value={formSeats}
                  onChange={(e) => setFormSeats(e.target.value)}
                  required
                  min="1"
                  max="20"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-gray-900"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {saving ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={t("common.confirm")}
        message={t("common.areYouSure")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
