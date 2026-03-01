"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useCallback } from "react";

interface Discount {
  id: string;
  name: string;
  nameEs: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  code: string | null;
  active: boolean;
}

export default function DiscountsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form, setForm] = useState({
    name: "",
    nameEs: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    value: "",
    code: "",
  });

  const fetchDiscounts = useCallback(async () => {
    try {
      const res = await fetch("/api/discounts");
      const json = await res.json();
      setDiscounts(json.data || []);
    } catch (err) {
      console.error("Failed to fetch discounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", nameEs: "", type: "PERCENTAGE", value: "", code: "" });
    setShowModal(true);
  }

  function openEdit(d: Discount) {
    setEditing(d);
    setForm({
      name: d.name,
      nameEs: d.nameEs,
      type: d.type,
      value: String(d.value),
      code: d.code || "",
    });
    setShowModal(true);
  }

  async function handleSubmit() {
    const body = {
      name: form.name,
      nameEs: form.nameEs,
      type: form.type,
      value: parseFloat(form.value),
      code: form.code || null,
    };

    if (editing) {
      await fetch(`/api/discounts/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setShowModal(false);
    fetchDiscounts();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/discounts/${id}`, { method: "DELETE" });
    fetchDiscounts();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("discounts.title")}</h1>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {t("discounts.addDiscount")}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-400">
          {t("common.loading")}
        </div>
      ) : discounts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-400">
          {t("discounts.noDiscountsYet")}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{t("discounts.discountName")}</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{t("discounts.discountType")}</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{t("discounts.discountValue")}</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{t("discounts.discountCode")}</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {locale === "es" ? d.nameEs : d.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          d.type === "PERCENTAGE"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {d.type === "PERCENTAGE" ? t("discounts.percentage") : t("discounts.fixed")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {d.type === "PERCENTAGE" ? `${d.value}%` : `$${Number(d.value).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {d.code || "—"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(d)}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                      >
                        {t("common.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? t("discounts.editDiscount") : t("discounts.addDiscount")}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t("discounts.discountName")} (EN)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t("discounts.discountNameEs")}</label>
                <input
                  type="text"
                  value={form.nameEs}
                  onChange={(e) => setForm({ ...form, nameEs: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t("discounts.discountType")}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENTAGE" | "FIXED" })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="PERCENTAGE">{t("discounts.percentage")}</option>
                  <option value="FIXED">{t("discounts.fixed")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t("discounts.discountValue")} {form.type === "PERCENTAGE" ? "(%)" : "(MXN)"}
                </label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  min="0"
                  step={form.type === "PERCENTAGE" ? "1" : "0.01"}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t("discounts.discountCode")}</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="PROMO10"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.nameEs || !form.value}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
