"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmModal from "@/components/common/ConfirmModal";
import { SkeletonRow } from "@/components/common/Skeleton";

interface Server {
  id: string;
  name: string;
  isActive: boolean;
  _count: { orders: number };
}

export default function ManageServersPage() {
  const t = useTranslations();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPin, setFormPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  async function fetchServers() {
    const res = await fetch("/api/servers");
    if (res.ok) {
      const json = await res.json();
      setServers(json.data || json);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchServers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const url = editingId ? `/api/servers/${editingId}` : "/api/servers";
    const method = editingId ? "PUT" : "POST";
    const body: Record<string, string> = { name: formName };
    if (formPin) body.pin = formPin;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      setFormName("");
      setFormPin("");
      setEditingId(null);
      fetchServers();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/servers/${deleteTarget}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchServers();
  }

  function startEdit(server: Server) {
    setEditingId(server.id);
    setFormName(server.name);
    setFormPin("");
    setShowForm(true);
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {t("admin.manageServers")}
        </h1>
        <button
          onClick={() => {
            setEditingId(null);
            setFormName("");
            setFormPin("");
            setShowForm(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + {t("admin.addServer")}
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold mb-4">
              {editingId ? t("common.save") : t("admin.addServer")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("admin.serverName")}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="Maria"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("admin.serverPin")}
                  {editingId && (
                    <span className="text-gray-400 ml-1 normal-case tracking-normal">(leave blank to keep)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required={!editingId}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 tracking-widest"
                  placeholder="1234"
                  inputMode="numeric"
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {saving ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Server list */}
      <div className="bg-white rounded-lg overflow-hidden shadow-sm">
        {servers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t("common.noResults")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("admin.serverName")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("reports.orderCount")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {servers.map((server) => (
                  <tr key={server.id} className="hover:bg-indigo-50/30">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {server.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {server._count.orders}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => startEdit(server)}
                        className="text-sm text-gray-700 font-medium px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(server.id)}
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
        )}
      </div>

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
