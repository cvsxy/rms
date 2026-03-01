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
        <h1 className="text-xl font-semibold text-gray-900">{t("discounts.title")}</h1>
        <button
          onClick={openAdd}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          {t("discounts.addDiscount")}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg p-8 text-center text-gray-400">
          {t("common.loading")}
        </div>
      ) : discounts.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center text-gray-400">
          {t("discounts.noDiscountsYet")}
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("discounts.discountName")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("discounts.discountType")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("discounts.discountValue")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("discounts.discountCode")}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50">
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d.code ? (
                        <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{d.code}</span>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(d)}
                        className="text-sm text-gray-700 font-medium px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="text-sm text-red-600 font-medium px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold mb-4">
              {editing ? t("discounts.editDiscount") : t("discounts.addDiscount")}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("discounts.discountName")} (EN)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("discounts.discountNameEs")}</label>
                <input
                  type="text"
                  value={form.nameEs}
                  onChange={(e) => setForm({ ...form, nameEs: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("discounts.discountType")}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENTAGE" | "FIXED" })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  <option value="PERCENTAGE">{t("discounts.percentage")}</option>
                  <option value="FIXED">{t("discounts.fixed")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("discounts.discountValue")} {form.type === "PERCENTAGE" ? "(%)" : "(MXN)"}
                </label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  min="0"
                  step={form.type === "PERCENTAGE" ? "1" : "0.01"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("discounts.discountCode")}</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="PROMO10"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.nameEs || !form.value}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
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
