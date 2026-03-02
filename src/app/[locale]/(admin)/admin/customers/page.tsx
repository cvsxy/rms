"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { formatMXN } from "@/lib/utils";
import { SkeletonRow } from "@/components/common/Skeleton";

interface LoyaltyMember {
  pointsBalance: number;
  tier: string;
  totalEarned?: number;
  totalRedeemed?: number;
  joinedAt?: string;
  transactions?: { id: string; type: string; points: number; description: string | null; createdAt: string }[];
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  dietaryNotes: string | null;
  tags: string[];
  totalVisits: number;
  totalSpent: number | string;
  lastVisit: string | null;
  createdAt: string;
  loyaltyMember: LoyaltyMember | null;
}

interface CustomerDetail extends Customer {
  orders: {
    id: string;
    status: string;
    createdAt: string;
    table: { number: number } | null;
    payment: { total: number | string; method: string; tip: number | string } | null;
    _count: { items: number };
  }[];
}

const ALL_TAGS = ["VIP", "Regular", "Tourist", "New"] as const;

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-700",
  Regular: "bg-blue-100 text-blue-700",
  Tourist: "bg-green-100 text-green-700",
  New: "bg-amber-100 text-amber-700",
};

const TIER_COLORS: Record<string, string> = {
  BRONZE: "bg-orange-100 text-orange-700",
  SILVER: "bg-gray-200 text-gray-700",
  GOLD: "bg-yellow-100 text-yellow-700",
};

function relativeDate(dateStr: string | null, locale: string): string {
  if (!dateStr) return "---";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return locale === "es" ? "Hoy" : "Today";
  if (diffDays === 1) return locale === "es" ? "Ayer" : "Yesterday";
  if (diffDays < 30) return locale === "es" ? `hace ${diffDays}d` : `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return locale === "es" ? `hace ${diffMonths}m` : `${diffMonths}mo ago`;
  return d.toLocaleDateString(locale === "es" ? "es-MX" : "en-US", { year: "numeric", month: "short" });
}

export default function CustomersPage() {
  const t = useTranslations();
  const locale = useLocale();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail panel
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", dietaryNotes: "", tags: [] as string[] });
  const [saving, setSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (tagFilter) params.set("tag", tagFilter);

    try {
      const res = await fetch(`/api/customers?${params}`);
      const json = await res.json();
      setCustomers(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.pages || 1);
    } catch {
      console.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  }, [page, search, tagFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [search, tagFilter]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/customers/${id}`);
      const json = await res.json();
      setDetail(json.data);
    } catch {
      console.error("Failed to fetch customer detail");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email: form.email || undefined }),
      });
      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchCustomers();
        if (editingId && detail?.id === editingId) openDetail(editingId);
      }
    } catch {
      console.error("Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm({ name: "", phone: "", email: "", notes: "", dietaryNotes: "", tags: [] });
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(c: Customer | CustomerDetail) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      notes: c.notes || "",
      dietaryNotes: c.dietaryNotes || "",
      tags: c.tags,
    });
    setShowModal(true);
  }

  function toggleFormTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  function tagLabel(tag: string): string {
    const map: Record<string, string> = {
      VIP: t("customers.vip"),
      Regular: t("customers.regular"),
      Tourist: t("customers.tourist"),
      New: t("customers.newCustomer"),
    };
    return map[tag] || tag;
  }

  if (loading && customers.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t("customers.title")}</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
          + {t("customers.addCustomer")}
        </button>
      </div>

      {/* Search + Tag filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("customers.searchCustomer")}
          className="admin-input"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTagFilter("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!tagFilter ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {locale === "es" ? "Todos" : "All"}
          </button>
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tagFilter === tag ? "bg-indigo-600 text-white" : `${TAG_COLORS[tag]} hover:opacity-80`}`}
            >
              {tagLabel(tag)}
            </button>
          ))}
        </div>
      </div>

      {/* Customer table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t("customers.noCustomersFound")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("customers.name")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("customers.phone")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">{t("customers.email")}</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("customers.totalVisits")}</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{t("customers.totalSpent")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">{t("customers.lastVisit")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">{t("customers.tags")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden xl:table-cell">{t("loyalty.tier")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} onClick={() => openDetail(c.id)} className="hover:bg-indigo-50/30 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{c.email || "---"}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{c.totalVisits}</td>
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">{formatMXN(c.totalSpent)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden lg:table-cell">{relativeDate(c.lastVisit, locale)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((tag) => (
                          <span key={tag} className={`text-xs font-medium px-2 py-0.5 rounded-full ${TAG_COLORS[tag] || "bg-gray-100 text-gray-600"}`}>{tagLabel(tag)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {c.loyaltyMember ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIER_COLORS[c.loyaltyMember.tier] || "bg-gray-100 text-gray-600"}`}>
                          {c.loyaltyMember.tier}
                        </span>
                      ) : <span className="text-gray-400">---</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">{total} {t("customers.title").toLowerCase()}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 min-h-[44px]">
                &larr;
              </button>
              <span className="px-3 py-2 text-sm text-gray-500 flex items-center">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 text-sm bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 min-h-[44px]">
                &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Detail Panel (slide-over) ──────────────────────────── */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="bg-white w-full max-w-md sm:max-w-lg h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="p-6 space-y-4">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
            ) : detail && (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{detail.name}</h2>
                    <p className="text-sm text-gray-500">{detail.phone}</p>
                    {detail.email && <p className="text-sm text-gray-500">{detail.email}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(detail)} className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      {t("common.edit")}
                    </button>
                    <button onClick={() => setDetail(null)} className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                      &times;
                    </button>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {detail.tags.map((tag) => (
                    <span key={tag} className={`text-xs font-medium px-2.5 py-1 rounded-full ${TAG_COLORS[tag] || "bg-gray-100 text-gray-600"}`}>{tagLabel(tag)}</span>
                  ))}
                </div>

                {/* Notes */}
                {detail.notes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t("customers.notes")}</p>
                    <p className="text-sm text-gray-700">{detail.notes}</p>
                  </div>
                )}
                {detail.dietaryNotes && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">{t("customers.dietaryNotes")}</p>
                    <p className="text-sm text-gray-700">{detail.dietaryNotes}</p>
                  </div>
                )}

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">{t("customers.totalVisits")}</p>
                    <p className="text-xl font-bold text-indigo-600">{detail.totalVisits}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">{t("customers.totalSpent")}</p>
                    <p className="text-xl font-bold text-emerald-600">{formatMXN(detail.totalSpent)}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">{t("customers.lastVisit")}</p>
                    <p className="text-sm font-semibold text-gray-800">{relativeDate(detail.lastVisit, locale)}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">{t("customers.memberSince")}</p>
                    <p className="text-sm font-semibold text-gray-800">{new Date(detail.createdAt).toLocaleDateString(locale === "es" ? "es-MX" : "en-US", { year: "numeric", month: "short" })}</p>
                  </div>
                </div>

                {/* Loyalty info */}
                {detail.loyaltyMember && (
                  <div className="bg-white rounded-lg border border-indigo-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">{t("loyalty.title")}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TIER_COLORS[detail.loyaltyMember.tier] || "bg-gray-100 text-gray-600"}`}>
                        {detail.loyaltyMember.tier}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">{t("loyalty.pointsBalance")}:</span>{" "}
                        <span className="font-semibold text-indigo-600">{detail.loyaltyMember.pointsBalance}</span>
                      </div>
                      {detail.loyaltyMember.totalEarned !== undefined && (
                        <div>
                          <span className="text-gray-500">{t("loyalty.totalEarned")}:</span>{" "}
                          <span className="font-medium">{detail.loyaltyMember.totalEarned}</span>
                        </div>
                      )}
                    </div>
                    {detail.loyaltyMember.transactions && detail.loyaltyMember.transactions.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">{t("loyalty.transactions")}</p>
                        {detail.loyaltyMember.transactions.slice(0, 5).map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{tx.description || tx.type}</span>
                            <span className={tx.type === "EARN" ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                              {tx.type === "EARN" ? "+" : "-"}{tx.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Order history */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("customers.orderHistory")}</h3>
                  {detail.orders.length === 0 ? (
                    <p className="text-sm text-gray-400">{t("common.noResults")}</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
                          <div>
                            <p className="font-medium text-gray-800">
                              {order.table ? `Table ${order.table.number}` : "---"} &middot; {order._count.items} items
                            </p>
                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString(locale === "es" ? "es-MX" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                          <div className="text-right">
                            {order.payment && <p className="font-semibold text-gray-900">{formatMXN(order.payment.total)}</p>}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${order.status === "CLOSED" ? "bg-green-100 text-green-700" : order.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Add/Edit Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold mb-4">{editingId ? t("customers.editCustomer") : t("customers.addCustomer")}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("customers.name")}</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="admin-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("customers.phone")}</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="admin-input" placeholder="+52 555 123 4567" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("customers.email")}</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="admin-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("customers.notes")}</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="admin-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("customers.dietaryNotes")}</label>
                <textarea value={form.dietaryNotes} onChange={(e) => setForm({ ...form, dietaryNotes: e.target.value })} rows={2} className="admin-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{t("customers.tags")}</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleFormTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${form.tags.includes(tag) ? "bg-indigo-600 text-white" : `${TAG_COLORS[tag]} hover:opacity-80`}`}
                    >
                      {tagLabel(tag)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                {t("common.cancel")}
              </button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.phone} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50">
                {saving ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
