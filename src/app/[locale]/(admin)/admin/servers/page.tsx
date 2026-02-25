"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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

  async function handleDelete(id: string) {
    if (!confirm(t("common.confirm") + "?")) return;
    await fetch(`/api/servers/${id}`, { method: "DELETE" });
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
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("admin.manageServers")}
        </h1>
        <button
          onClick={() => {
            setEditingId(null);
            setFormName("");
            setFormPin("");
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + {t("admin.addServer")}
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? t("common.save") : t("admin.addServer")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("admin.serverName")}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Maria"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("admin.serverPin")}
                  {editingId && (
                    <span className="text-gray-400 ml-1">(leave blank to keep)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required={!editingId}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 tracking-widest"
                  placeholder="1234"
                  inputMode="numeric"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Server list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {servers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t("common.noResults")}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.serverName")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("reports.orderCount")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {servers.map((server) => (
                <tr key={server.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {server.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {server._count.orders}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => startEdit(server)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      {t("common.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
