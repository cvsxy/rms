"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { formatMXN } from "@/lib/utils";

interface Program { id: string; name: string; nameEs: string; pointsPerPeso: number; active: boolean }
interface Reward { id: string; programId: string; name: string; nameEs: string; pointsCost: number; type: "PERCENTAGE" | "FIXED"; value: number; active: boolean }
interface Member { id: string; customerId: string; programId: string; pointsBalance: number; totalEarned: number; totalRedeemed: number; tier: string; joinedAt: string; customer: { id: string; name: string; phone: string }; _count: { transactions: number } }
interface MemberStats { totalMembers: number; totalPointsIssued: number; totalRedeemed: number }
interface Transaction { id: string; type: string; points: number; description: string | null; createdAt: string; reward: { name: string; nameEs: string; pointsCost: number } | null }

export default function LoyaltyPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [program, setProgram] = useState<Program | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats>({ totalMembers: 0, totalPointsIssued: 0, totalRedeemed: 0 });
  const [loading, setLoading] = useState(true);

  // Program settings
  const [editingProgram, setEditingProgram] = useState(false);
  const [programForm, setProgramForm] = useState({ name: "", nameEs: "", pointsPerPeso: "1", active: true });

  // Reward modal
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardForm, setRewardForm] = useState({ name: "", nameEs: "", pointsCost: "", type: "PERCENTAGE" as "PERCENTAGE" | "FIXED", value: "", active: true });

  // Member detail
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, rRes, mRes] = await Promise.all([
        fetch("/api/loyalty/program"),
        fetch("/api/loyalty/rewards?all=true"),
        fetch("/api/loyalty/members"),
      ]);
      const pJson = await pRes.json();
      const rJson = await rRes.json();
      const mJson = await mRes.json();
      setProgram(pJson.data || null);
      setRewards(rJson.data || []);
      setMembers(mJson.data || []);
      if (mJson.stats) setStats(mJson.stats);
    } catch (err) {
      console.error("Failed to fetch loyalty data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openEditProgram() {
    if (program) {
      setProgramForm({ name: program.name, nameEs: program.nameEs, pointsPerPeso: String(program.pointsPerPeso), active: program.active });
    } else {
      setProgramForm({ name: "", nameEs: "", pointsPerPeso: "1", active: true });
    }
    setEditingProgram(true);
  }

  async function saveProgram() {
    const body = { name: programForm.name, nameEs: programForm.nameEs, pointsPerPeso: parseFloat(programForm.pointsPerPeso), active: programForm.active };
    if (program) {
      await fetch("/api/loyalty/program", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/loyalty/program", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setEditingProgram(false);
    fetchAll();
  }

  function openAddReward() {
    setEditingReward(null);
    setRewardForm({ name: "", nameEs: "", pointsCost: "", type: "PERCENTAGE", value: "", active: true });
    setShowRewardModal(true);
  }

  function openEditReward(r: Reward) {
    setEditingReward(r);
    setRewardForm({ name: r.name, nameEs: r.nameEs, pointsCost: String(r.pointsCost), type: r.type, value: String(r.value), active: r.active });
    setShowRewardModal(true);
  }

  async function saveReward() {
    const body = {
      name: rewardForm.name, nameEs: rewardForm.nameEs,
      pointsCost: parseInt(rewardForm.pointsCost), type: rewardForm.type,
      value: parseFloat(rewardForm.value), active: rewardForm.active,
      ...(editingReward ? {} : { programId: program?.id }),
    };
    if (editingReward) {
      await fetch(`/api/loyalty/rewards/${editingReward.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/loyalty/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setShowRewardModal(false);
    fetchAll();
  }

  async function toggleRewardActive(r: Reward) {
    await fetch(`/api/loyalty/rewards/${r.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !r.active }) });
    fetchAll();
  }

  async function openMemberDetail(m: Member) {
    setSelectedMember(m);
    setTxLoading(true);
    try {
      const res = await fetch(`/api/loyalty/members/${m.customerId}`);
      const json = await res.json();
      setTransactions(json.data?.transactions || []);
    } catch { setTransactions([]); }
    finally { setTxLoading(false); }
  }

  const tierColors: Record<string, string> = {
    BRONZE: "bg-amber-100 text-amber-700",
    SILVER: "bg-gray-200 text-gray-700",
    GOLD: "bg-yellow-100 text-yellow-700",
  };

  const txTypeLabels: Record<string, string> = {
    EARN: t("loyalty.earn"), REDEEM: t("loyalty.redeem"),
    ADJUST: t("loyalty.adjust"), EXPIRE: t("loyalty.expire"),
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-6">{t("loyalty.title")}</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{t("loyalty.title")}</h1>

      {/* Program Settings */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{t("loyalty.programSettings")}</h2>
          {!editingProgram && (
            <button onClick={openEditProgram} className="text-sm text-indigo-600 font-medium hover:text-indigo-700">
              {program ? t("common.edit") : t("loyalty.createProgram")}
            </button>
          )}
        </div>
        {editingProgram ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="admin-label">{t("loyalty.programName")}</label>
                <input type="text" value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} className="admin-input" />
              </div>
              <div>
                <label className="admin-label">{t("loyalty.programNameEs")}</label>
                <input type="text" value={programForm.nameEs} onChange={(e) => setProgramForm({ ...programForm, nameEs: e.target.value })} className="admin-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="admin-label">{t("loyalty.pointsPerPeso")}</label>
                <input type="number" value={programForm.pointsPerPeso} onChange={(e) => setProgramForm({ ...programForm, pointsPerPeso: e.target.value })} className="admin-input" min="0.01" step="0.01" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={programForm.active} onChange={(e) => setProgramForm({ ...programForm, active: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                  {t("loyalty.programActive")}
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingProgram(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
              <button onClick={saveProgram} disabled={!programForm.name || !programForm.nameEs} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{t("common.save")}</button>
            </div>
          </div>
        ) : program ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t("common.name")}</span>
              <p className="font-medium text-gray-900">{locale === "es" ? program.nameEs : program.name}</p>
            </div>
            <div>
              <span className="text-gray-500">{t("loyalty.pointsPerPeso")}</span>
              <p className="font-medium text-gray-900">{Number(program.pointsPerPeso)} {t("loyalty.pts")}</p>
            </div>
            <div>
              <span className="text-gray-500">{t("reservations.status")}</span>
              <p className="font-medium">
                <span className={`text-xs px-2 py-0.5 rounded ${program.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {program.active ? t("loyalty.active") : t("loyalty.inactive")}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">{t("loyalty.noProgram")}</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 border-l-4 border-l-indigo-500">
          <span className="text-sm text-gray-500">{t("loyalty.totalMembers")}</span>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalMembers}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 border-l-4 border-l-emerald-500">
          <span className="text-sm text-gray-500">{t("loyalty.totalPointsIssued")}</span>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalPointsIssued.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 border-l-4 border-l-amber-500">
          <span className="text-sm text-gray-500">{t("loyalty.rewardsRedeemed")}</span>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalRedeemed.toLocaleString()}</p>
        </div>
      </div>

      {/* Rewards Section */}
      {program && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-semibold text-gray-900">{t("loyalty.rewards")}</h2>
            <button onClick={openAddReward} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              {t("loyalty.createReward")}
            </button>
          </div>
          {rewards.length === 0 ? (
            <div className="px-6 pb-6 text-sm text-gray-400">{t("loyalty.noRewards")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("loyalty.rewardName")}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("loyalty.pointsCost")}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("loyalty.rewardType")}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("loyalty.rewardValue")}</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rewards.map((r) => (
                    <tr key={r.id} className={`hover:bg-indigo-50/30 ${!r.active ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{locale === "es" ? r.nameEs : r.name}</td>
                      <td className="px-4 py-3 text-gray-700">{r.pointsCost.toLocaleString()} {t("loyalty.pts")}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${r.type === "PERCENTAGE" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {r.type === "PERCENTAGE" ? t("discounts.percentage") : t("discounts.fixed")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.type === "PERCENTAGE" ? `${Number(r.value)}%` : formatMXN(r.value)}</td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => toggleRewardActive(r)} className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${r.active ? "text-amber-600 border-amber-200 hover:bg-amber-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}>
                          {r.active ? t("loyalty.inactive") : t("loyalty.active")}
                        </button>
                        <button onClick={() => openEditReward(r)} className="text-sm text-gray-700 font-medium px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          {t("common.edit")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Members Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 pb-4">
          <h2 className="text-base font-semibold text-gray-900">{t("loyalty.members")}</h2>
        </div>
        {members.length === 0 ? (
          <div className="px-6 pb-6 text-sm text-gray-400">{t("loyalty.noMembers")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("customers.name")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t("customers.phone")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("loyalty.pointsBalance")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("loyalty.tier")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">{t("loyalty.totalEarned")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">{t("loyalty.totalRedeemed")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t("loyalty.joinDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m) => (
                  <tr key={m.id} onClick={() => openMemberDetail(m)} className="hover:bg-indigo-50/30 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.customer.name}</td>
                    <td className="px-4 py-3 text-gray-700 hidden sm:table-cell">{m.customer.phone}</td>
                    <td className="px-4 py-3 font-medium text-indigo-600">{m.pointsBalance.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${tierColors[m.tier] || "bg-gray-100 text-gray-500"}`}>
                        {t(`loyalty.${m.tier.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 hidden md:table-cell">{m.totalEarned.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700 hidden md:table-cell">{m.totalRedeemed.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{new Date(m.joinedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reward Modal */}
      {showRewardModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold mb-4">
              {editingReward ? t("loyalty.editReward") : t("loyalty.createReward")}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="admin-label">{t("loyalty.rewardName")} (EN)</label>
                <input type="text" value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} className="admin-input" />
              </div>
              <div>
                <label className="admin-label">{t("loyalty.rewardNameEs")}</label>
                <input type="text" value={rewardForm.nameEs} onChange={(e) => setRewardForm({ ...rewardForm, nameEs: e.target.value })} className="admin-input" />
              </div>
              <div>
                <label className="admin-label">{t("loyalty.pointsCost")}</label>
                <input type="number" value={rewardForm.pointsCost} onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: e.target.value })} className="admin-input" min="1" />
              </div>
              <div>
                <label className="admin-label">{t("loyalty.rewardType")}</label>
                <select value={rewardForm.type} onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value as "PERCENTAGE" | "FIXED" })} className="admin-select">
                  <option value="PERCENTAGE">{t("discounts.percentage")}</option>
                  <option value="FIXED">{t("discounts.fixed")}</option>
                </select>
              </div>
              <div>
                <label className="admin-label">{t("loyalty.rewardValue")} {rewardForm.type === "PERCENTAGE" ? "(%)" : "(MXN)"}</label>
                <input type="number" value={rewardForm.value} onChange={(e) => setRewardForm({ ...rewardForm, value: e.target.value })} className="admin-input" min="0" step={rewardForm.type === "PERCENTAGE" ? "1" : "0.01"} />
              </div>
              {editingReward && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={rewardForm.active} onChange={(e) => setRewardForm({ ...rewardForm, active: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                  {t("loyalty.active")}
                </label>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowRewardModal(false)} className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">{t("common.cancel")}</button>
              <button onClick={saveReward} disabled={!rewardForm.name || !rewardForm.nameEs || !rewardForm.pointsCost || !rewardForm.value} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50">{t("common.save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Member Transaction Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">{selectedMember.customer.name}</h2>
              <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-sm">
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-indigo-600 font-bold text-lg">{selectedMember.pointsBalance.toLocaleString()}</p>
                <span className="text-xs text-gray-500">{t("loyalty.pointsBalance")}</span>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-emerald-600 font-bold text-lg">{selectedMember.totalEarned.toLocaleString()}</p>
                <span className="text-xs text-gray-500">{t("loyalty.totalEarned")}</span>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-amber-600 font-bold text-lg">{selectedMember.totalRedeemed.toLocaleString()}</p>
                <span className="text-xs text-gray-500">{t("loyalty.totalRedeemed")}</span>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t("loyalty.transactionHistory")}</h3>
            <div className="flex-1 overflow-y-auto">
              {txLoading ? (
                <div className="text-center text-gray-400 py-4">{t("common.loading")}</div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">{t("loyalty.noTransactions")}</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${tx.type === "EARN" ? "bg-green-100 text-green-700" : tx.type === "REDEEM" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                          {txTypeLabels[tx.type] || tx.type}
                        </span>
                        {tx.description && <p className="text-xs text-gray-500 mt-1">{tx.description}</p>}
                        {tx.reward && <p className="text-xs text-gray-500 mt-0.5">{locale === "es" ? tx.reward.nameEs : tx.reward.name}</p>}
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${tx.type === "EARN" ? "text-green-600" : tx.type === "REDEEM" ? "text-red-600" : "text-gray-600"}`}>
                          {tx.type === "EARN" ? "+" : "-"}{Math.abs(tx.points).toLocaleString()} {t("loyalty.pts")}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
