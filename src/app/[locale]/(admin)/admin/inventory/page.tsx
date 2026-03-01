"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmModal from "@/components/common/ConfirmModal";

interface Ingredient {
  id: string;
  name: string;
  nameEs: string;
  unit: string;
  currentStock: string;
  lowStockThreshold: string;
  costPerUnit: string;
  menuItems: { menuItem: { id: string; name: string; nameEs: string } }[];
}

export default function InventoryPage() {
  const t = useTranslations();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formNameEs, setFormNameEs] = useState("");
  const [formUnit, setFormUnit] = useState("units");
  const [formStock, setFormStock] = useState("0");
  const [formThreshold, setFormThreshold] = useState("0");
  const [formCost, setFormCost] = useState("0");

  // Delivery state
  const [deliveryAmounts, setDeliveryAmounts] = useState<Record<string, string>>({});
  const [savingDelivery, setSavingDelivery] = useState(false);

  async function fetchIngredients() {
    try {
      const res = await fetch("/api/inventory");
      const json = await res.json();
      setIngredients(json.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    fetchIngredients();
  }, []);

  function resetForm() {
    setFormName("");
    setFormNameEs("");
    setFormUnit("units");
    setFormStock("0");
    setFormThreshold("0");
    setFormCost("0");
    setEditingId(null);
  }

  function startEdit(ing: Ingredient) {
    setEditingId(ing.id);
    setFormName(ing.name);
    setFormNameEs(ing.nameEs);
    setFormUnit(ing.unit);
    setFormStock(ing.currentStock);
    setFormThreshold(ing.lowStockThreshold);
    setFormCost(ing.costPerUnit);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = {
      name: formName,
      nameEs: formNameEs,
      unit: formUnit,
      currentStock: parseFloat(formStock) || 0,
      lowStockThreshold: parseFloat(formThreshold) || 0,
      costPerUnit: parseFloat(formCost) || 0,
    };

    const url = editingId ? `/api/inventory/${editingId}` : "/api/inventory";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      resetForm();
      fetchIngredients();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/inventory/${deleteTarget}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchIngredients();
  }

  async function handleDelivery() {
    setSavingDelivery(true);
    const adjustments = Object.entries(deliveryAmounts)
      .filter(([, amount]) => parseFloat(amount) > 0)
      .map(([id, amount]) => ({ id, amount: parseFloat(amount) }));

    await Promise.all(
      adjustments.map(({ id, amount }) =>
        fetch(`/api/inventory/${id}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adjustment: amount }),
        })
      )
    );

    setShowDelivery(false);
    setDeliveryAmounts({});
    fetchIngredients();
    setSavingDelivery(false);
  }

  const filtered = ingredients.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.nameEs.toLowerCase().includes(search.toLowerCase())
  );

  function getStockStatus(ing: Ingredient) {
    const stock = Number(ing.currentStock);
    const threshold = Number(ing.lowStockThreshold);
    if (stock <= 0) return "out";
    if (stock <= threshold) return "low";
    return "ok";
  }

  const units = ["units", "kg", "g", "L", "ml", "oz", "lb"];

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("inventory.title")}</h1>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setDeliveryAmounts({});
              setShowDelivery(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            {t("inventory.receiveDelivery")}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + {t("inventory.addIngredient")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("inventory.searchIngredients")}
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Inventory table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200">
          {t("inventory.noIngredients")}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.ingredientName")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.unit")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.currentStock")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.lowStockThreshold")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.costPerUnit")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.stockLevel")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((ing) => {
                  const status = getStockStatus(ing);
                  return (
                    <tr
                      key={ing.id}
                      className={`hover:bg-gray-50 ${status === "out" ? "bg-red-50" : status === "low" ? "bg-amber-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{ing.name}</div>
                        <div className="text-xs text-gray-500">{ing.nameEs}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ing.unit}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {Number(ing.currentStock).toFixed(ing.unit === "units" ? 0 : 2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {Number(ing.lowStockThreshold).toFixed(ing.unit === "units" ? 0 : 2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        ${Number(ing.costPerUnit).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            status === "out"
                              ? "bg-red-100 text-red-800"
                              : status === "low"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {status === "out"
                            ? t("inventory.outOfStock")
                            : status === "low"
                            ? t("inventory.lowStock")
                            : t("inventory.inStock")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(ing)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(ing.id)}
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? t("inventory.editIngredient") : t("inventory.addIngredient")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("inventory.ingredientName")} (EN)
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("inventory.ingredientNameEs")} (ES)
                  </label>
                  <input
                    type="text"
                    value={formNameEs}
                    onChange={(e) => setFormNameEs(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("inventory.unit")}
                </label>
                <select
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("inventory.currentStock")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("inventory.lowStockThreshold")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("inventory.costPerUnit")} ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {saving ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Delivery Modal */}
      {showDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("inventory.receiveDelivery")}
            </h2>
            <div className="space-y-3 mb-6">
              {ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{ing.name}</div>
                    <div className="text-xs text-gray-500">
                      {t("inventory.currentStock")}: {Number(ing.currentStock).toFixed(ing.unit === "units" ? 0 : 2)} {ing.unit}
                    </div>
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={deliveryAmounts[ing.id] || ""}
                      onChange={(e) =>
                        setDeliveryAmounts((prev) => ({
                          ...prev,
                          [ing.id]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-10">{ing.unit}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDelivery(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDelivery}
                disabled={savingDelivery}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {savingDelivery ? t("common.loading") : t("common.confirm")}
              </button>
            </div>
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
