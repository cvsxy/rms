"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useCallback, useMemo } from "react";

type RStatus = "PENDING" | "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
type RSource = "PHONE" | "WALKIN" | "WHATSAPP" | "WEBSITE" | "MANUAL";

interface Reservation {
  id: string; guestName: string; guestPhone: string; guestEmail: string | null;
  date: string; time: string; partySize: number; status: RStatus; source: RSource;
  notes: string | null; tableId: string | null;
  table: { id: string; number: number; seats: number } | null;
  customer: { id: string; name: string; phone: string } | null;
}
interface TableOption { id: string; number: number; seats: number; status: string; active: boolean }
interface WaitlistEntry {
  id: string; guestName: string; guestPhone: string; partySize: number;
  estimatedWait: number | null; notes: string | null; notifiedAt: string | null;
  seatedAt: string | null; cancelledAt: string | null; createdAt: string;
}

const STATUSES: RStatus[] = ["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"];
const SOURCES: RSource[] = ["PHONE", "WALKIN", "WHATSAPP", "WEBSITE", "MANUAL"];
const STATUS_COLORS: Record<RStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700", CONFIRMED: "bg-blue-100 text-blue-700",
  SEATED: "bg-green-100 text-green-700", COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700", NO_SHOW: "bg-orange-100 text-orange-700",
};
const SRC_KEYS: Record<RSource, string> = {
  PHONE: "phone", WALKIN: "walkin", WHATSAPP: "whatsapp", WEBSITE: "website", MANUAL: "manual",
};

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TIME_SLOTS = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 11;
  return `${String(h).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`;
});

const TH = "text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap";
const TH_R = "text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap";

const ACTION_COLORS: Record<string, string> = {
  green: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  blue: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  red: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  orange: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
};

function ActionBtn({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors min-h-[44px] ${ACTION_COLORS[color] || ""}`}>
      {children}
    </button>
  );
}

export default function ReservationsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const es = locale === "es";

  const [dateFilter, setDateFilter] = useState(toDateStr(new Date()));
  const [statusFilter, setStatusFilter] = useState<RStatus | "ALL">("ALL");
  const [activePreset, setActivePreset] = useState<string | null>("today");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [form, setForm] = useState({ guestName: "", guestPhone: "", guestEmail: "", date: toDateStr(new Date()), time: "19:00", partySize: "2", tableId: "", source: "MANUAL" as RSource, notes: "" });
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [wlLoading, setWlLoading] = useState(false);
  const [showWlForm, setShowWlForm] = useState(false);
  const [wlForm, setWlForm] = useState({ guestName: "", guestPhone: "", partySize: "2" });

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (dateFilter) p.set("date", dateFilter);
      if (statusFilter !== "ALL") p.set("status", statusFilter);
      const res = await fetch(`/api/reservations?${p}`);
      const j = await res.json();
      setReservations(j.data || []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, [dateFilter, statusFilter]);

  const fetchTables = useCallback(async () => {
    try {
      const r = await fetch("/api/tables");
      const j = await r.json();
      setTables((j.data || []).filter((x: TableOption) => x.active));
    } catch { /* empty */ }
  }, []);

  const fetchWaitlist = useCallback(async () => {
    setWlLoading(true);
    try {
      const r = await fetch("/api/waitlist");
      const j = await r.json();
      setWaitlist(j.data || []);
    } catch { /* empty */ } finally { setWlLoading(false); }
  }, []);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);
  useEffect(() => { fetchTables(); }, [fetchTables]);

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString(es ? "es-MX" : "en-US", { day: "numeric", month: "long" });
  }
  function fmtTime(time: string) {
    const [h, m] = time.split(":");
    if (es) return `${h}:${m}`;
    const hr = parseInt(h);
    return `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  }
  function minSince(s: string) { return Math.floor((Date.now() - new Date(s).getTime()) / 60000); }

  function setPreset(p: string) {
    setActivePreset(p);
    const now = new Date();
    if (p === "tomorrow") { now.setDate(now.getDate() + 1); }
    setDateFilter(toDateStr(now));
  }

  const sLabel = useCallback((s: RStatus) => {
    const m: Record<RStatus, string> = { PENDING: t("reservations.pending"), CONFIRMED: t("reservations.confirmed"), SEATED: t("reservations.seated"), COMPLETED: t("reservations.completed"), CANCELLED: t("reservations.cancelled"), NO_SHOW: t("reservations.noShow") };
    return m[s];
  }, [t]);

  const srcLabel = useCallback((s: RSource) => t(`reservations.${SRC_KEYS[s]}`), [t]);

  async function patchStatus(id: string, status: string) {
    await fetch(`/api/reservations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchReservations();
  }
  async function confirm(id: string) {
    await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
    fetchReservations();
  }
  async function seat(id: string) {
    await fetch(`/api/reservations/${id}/seat`, { method: "POST" });
    fetchReservations();
  }

  function openCreate() {
    setEditing(null);
    setForm({ guestName: "", guestPhone: "", guestEmail: "", date: dateFilter, time: "19:00", partySize: "2", tableId: "", source: "MANUAL", notes: "" });
    setShowModal(true);
  }
  function openEdit(r: Reservation) {
    setEditing(r);
    setForm({ guestName: r.guestName, guestPhone: r.guestPhone, guestEmail: r.guestEmail || "", date: r.date.slice(0, 10), time: r.time, partySize: String(r.partySize), tableId: r.tableId || "", source: r.source, notes: r.notes || "" });
    setShowModal(true);
  }

  async function submitReservation() {
    const body = { guestName: form.guestName, guestPhone: form.guestPhone, guestEmail: form.guestEmail || undefined, date: form.date, time: form.time, partySize: parseInt(form.partySize), tableId: form.tableId || undefined, source: form.source, notes: form.notes || undefined };
    if (editing) {
      await fetch(`/api/reservations/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setShowModal(false);
    fetchReservations();
  }

  async function addWl() {
    await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guestName: wlForm.guestName, guestPhone: wlForm.guestPhone, partySize: parseInt(wlForm.partySize) }) });
    setShowWlForm(false);
    setWlForm({ guestName: "", guestPhone: "", partySize: "2" });
    fetchWaitlist();
  }
  async function wlAction(id: string, action: "notify" | "seat" | "cancel") {
    await fetch(`/api/waitlist/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    fetchWaitlist();
  }

  const availTables = useMemo(() => {
    const ps = parseInt(form.partySize) || 1;
    return tables.filter((t) => t.seats >= ps);
  }, [tables, form.partySize]);

  const presetBtn = (key: string, label: string) => (
    <button onClick={() => setPreset(key)} className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${activePreset === key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{label}</button>
  );

  const isPendConf = (s: RStatus) => s === "PENDING" || s === "CONFIRMED";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t("reservations.title")}</h1>
        <div className="flex gap-2">
          <button onClick={() => { if (!showWaitlist) fetchWaitlist(); setShowWaitlist(!showWaitlist); }} className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            {t("reservations.waitlist")}
            {waitlist.length > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-amber-500 rounded-full">{waitlist.length}</span>}
          </button>
          <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">{t("reservations.createReservation")}</button>
        </div>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-3">
        <input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setActivePreset(null); }} className="admin-input max-w-[180px]" />
        {presetBtn("today", t("reservations.today"))}
        {presetBtn("tomorrow", es ? "Ma\u00f1ana" : "Tomorrow")}
        {presetBtn("week", t("reservations.thisWeek"))}
        <span className="ml-auto text-sm text-gray-500">{fmtDate(dateFilter)}</span>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {(["ALL", ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            {s === "ALL" ? (es ? "Todos" : "All") : sLabel(s)}
          </button>
        ))}
      </div>

      {/* Waitlist */}
      {showWaitlist && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">{t("reservations.waitlist")}</h2>
            <button onClick={() => setShowWlForm(!showWlForm)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">{t("reservations.addToWaitlist")}</button>
          </div>
          {showWlForm && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <input placeholder={t("reservations.guestName")} value={wlForm.guestName} onChange={(e) => setWlForm({ ...wlForm, guestName: e.target.value })} className="admin-input" />
              <input placeholder={t("reservations.guestPhone")} value={wlForm.guestPhone} onChange={(e) => setWlForm({ ...wlForm, guestPhone: e.target.value })} className="admin-input" />
              <input type="number" placeholder={t("reservations.partySize")} value={wlForm.partySize} onChange={(e) => setWlForm({ ...wlForm, partySize: e.target.value })} className="admin-input" min="1" />
              <button onClick={addWl} disabled={!wlForm.guestName || !wlForm.guestPhone} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">{t("common.save")}</button>
            </div>
          )}
          {wlLoading ? (
            <p className="text-sm text-gray-400 py-3 text-center">{t("common.loading")}</p>
          ) : waitlist.length === 0 ? (
            <p className="text-sm text-gray-400 py-3 text-center">{t("reservations.noWaitlist")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50/80">
                  <th className={TH}>{t("reservations.guestName")}</th>
                  <th className={TH}>{t("reservations.guestPhone")}</th>
                  <th className={TH}>{t("reservations.partySize")}</th>
                  <th className={TH}>{es ? "Tiempo" : "Wait Time"}</th>
                  <th className={TH_R}>{t("common.actions")}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {waitlist.map((w) => (
                    <tr key={w.id} className="hover:bg-indigo-50/30">
                      <td className="px-4 py-3 font-medium text-gray-900">{w.guestName}</td>
                      <td className="px-4 py-3 text-gray-600">{w.guestPhone}</td>
                      <td className="px-4 py-3 text-gray-600">{w.partySize}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {minSince(w.createdAt)} {t("reservations.minutes")}
                        {w.notifiedAt && <span className="ml-1.5 text-xs text-green-600 font-medium">{t("reservations.guestNotified")}</span>}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5">
                        <ActionBtn onClick={() => wlAction(w.id, "notify")} color="blue">{t("reservations.notifyGuest")}</ActionBtn>
                        <ActionBtn onClick={() => wlAction(w.id, "seat")} color="green">{t("reservations.seat")}</ActionBtn>
                        <ActionBtn onClick={() => wlAction(w.id, "cancel")} color="red">{t("reservations.removeFromWaitlist")}</ActionBtn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reservations table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">{t("common.loading")}</div>
        ) : reservations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t("reservations.noReservations")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80">
                <th className={TH}>{t("reservations.time")}</th>
                <th className={TH}>{t("reservations.guestName")}</th>
                <th className={`${TH} hidden sm:table-cell`}>{t("reservations.guestPhone")}</th>
                <th className={TH}>{t("reservations.partySize")}</th>
                <th className={TH}>{t("reservations.table")}</th>
                <th className={TH}>{t("reservations.status")}</th>
                <th className={`${TH} hidden sm:table-cell`}>{t("reservations.source")}</th>
                <th className={TH_R}>{t("common.actions")}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/30 cursor-pointer" onClick={() => openEdit(r)}>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{fmtTime(r.time)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.guestName}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden sm:table-cell">{r.guestPhone}</td>
                    <td className="px-4 py-3 text-gray-600">{r.partySize}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.table ? <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-700 rounded">#{r.table.number}</span> : <span className="text-gray-400">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[r.status]}`}>{sLabel(r.status)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell"><span className="text-xs text-gray-500">{srcLabel(r.source)}</span></td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {r.status === "PENDING" && <ActionBtn onClick={() => confirm(r.id)} color="green">{t("reservations.confirm")}</ActionBtn>}
                      {isPendConf(r.status) && <ActionBtn onClick={() => seat(r.id)} color="blue">{t("reservations.seat")}</ActionBtn>}
                      {isPendConf(r.status) && <ActionBtn onClick={() => patchStatus(r.id, "CANCELLED")} color="red">{t("reservations.cancel")}</ActionBtn>}
                      {isPendConf(r.status) && <ActionBtn onClick={() => patchStatus(r.id, "NO_SHOW")} color="orange">{t("reservations.markNoShow")}</ActionBtn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editing ? t("reservations.editReservation") : t("reservations.createReservation")}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="admin-label">{t("reservations.guestName")}</label>
                <input type="text" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} className="admin-input" />
              </div>
              <div>
                <label className="admin-label">{t("reservations.guestPhone")}</label>
                <input type="tel" value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} className="admin-input" />
              </div>
              <div>
                <label className="admin-label">{t("reservations.guestEmail")}</label>
                <input type="email" value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} className="admin-input" placeholder={es ? "Opcional" : "Optional"} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">{t("reservations.date")}</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="admin-input" />
                </div>
                <div>
                  <label className="admin-label">{t("reservations.time")}</label>
                  <select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="admin-select">
                    {TIME_SLOTS.map((s) => <option key={s} value={s}>{fmtTime(s)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">{t("reservations.partySize")}</label>
                  <input type="number" value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })} className="admin-input" min="1" max="20" />
                </div>
                <div>
                  <label className="admin-label">{t("reservations.table")}</label>
                  <select value={form.tableId} onChange={(e) => setForm({ ...form, tableId: e.target.value })} className="admin-select">
                    <option value="">&mdash;</option>
                    {availTables.map((tbl) => <option key={tbl.id} value={tbl.id}>#{tbl.number} ({tbl.seats} {es ? "asientos" : "seats"})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="admin-label">{t("reservations.source")}</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as RSource })} className="admin-select">
                  {SOURCES.map((s) => <option key={s} value={s}>{srcLabel(s)}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-label">{t("reservations.notes")}</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="admin-input min-h-[80px] resize-y" rows={3} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">{t("common.cancel")}</button>
              <button onClick={submitReservation} disabled={!form.guestName || !form.guestPhone || !form.date || !form.time} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50">{t("common.save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
