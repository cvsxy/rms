"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { formatMXN } from "@/lib/utils";

interface GiftCard {
  id: string;
  code: string;
  originalAmount: number;
  balance: number;
  purchaserName: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
  _count?: { usages: number };
}

interface GiftCardUsage {
  id: string;
  amount: number;
  orderId: string | null;
  createdAt: string;
}

interface GiftCardDetail extends GiftCard {
  usages: GiftCardUsage[];
}

export default function GiftCardsPage() {
  const t = useTranslations();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalCards, setTotalCards] = useState(0);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [revenueFromCards, setRevenueFromCards] = useState(0);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ amount: "", recipientName: "", recipientPhone: "", expiresAt: "" });
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // Detail panel
  const [selectedCard, setSelectedCard] = useState<GiftCardDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch("/api/gift-cards");
      const json = await res.json();
      const data: GiftCard[] = json.data || [];
      setCards(data);
      setTotalCards(data.length);
      setOutstandingBalance(data.filter((c) => c.active && Number(c.balance) > 0).reduce((sum, c) => sum + Number(c.balance), 0));
      setRevenueFromCards(data.reduce((sum, c) => sum + Number(c.originalAmount), 0));
    } catch (err) {
      console.error("Failed to fetch gift cards:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  function openCreate() {
    setCreateForm({ amount: "", recipientName: "", recipientPhone: "", expiresAt: "" });
    setCreatedCode(null);
    setShowCreateModal(true);
  }

  async function handleCreate() {
    const body: Record<string, unknown> = { originalAmount: parseFloat(createForm.amount) };
    if (createForm.recipientName) body.recipientName = createForm.recipientName;
    if (createForm.recipientPhone) body.recipientPhone = createForm.recipientPhone;
    if (createForm.expiresAt) body.expiresAt = new Date(createForm.expiresAt).toISOString();

    const res = await fetch("/api/gift-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.data?.code) {
      setCreatedCode(json.data.code);
    }
    fetchCards();
  }

  async function openDetail(card: GiftCard) {
    setDetailLoading(true);
    setSelectedCard(null);
    try {
      const res = await fetch(`/api/gift-cards/${card.id}`);
      const json = await res.json();
      setSelectedCard(json.data || null);
    } catch {
      setSelectedCard(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function getStatus(card: GiftCard): { label: string; className: string } {
    if (Number(card.balance) <= 0) return { label: t("giftCards.depleted"), className: "bg-gray-100 text-gray-500" };
    if (card.expiresAt && new Date(card.expiresAt) < new Date()) return { label: t("giftCards.expired"), className: "bg-red-100 text-red-700" };
    if (!card.active) return { label: t("giftCards.expired"), className: "bg-red-100 text-red-700" };
    return { label: t("giftCards.active"), className: "bg-green-100 text-green-700" };
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-6">{t("giftCards.title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{t("giftCards.title")}</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 border-l-4 border-l-indigo-500">
          <span className="text-sm text-gray-500">{t("giftCards.totalCards")}</span>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalCards}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 border-l-4 border-l-emerald-500">
          <span className="text-sm text-gray-500">{t("giftCards.outstandingBalance")}</span>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formatMXN(outstandingBalance)}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 border-l-4 border-l-amber-500">
          <span className="text-sm text-gray-500">{t("giftCards.revenueFromCards")}</span>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formatMXN(revenueFromCards)}</p>
        </div>
      </div>

      {/* Create button */}
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          {t("giftCards.createGiftCard")}
        </button>
      </div>

      {/* Gift Cards Table */}
      {cards.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center text-gray-400 shadow-sm">
          {t("giftCards.noGiftCards")}
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("giftCards.code")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("giftCards.originalAmount")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("giftCards.balance")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t("giftCards.recipientName")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t("giftCards.status")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">{t("giftCards.created")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cards.map((card) => {
                  const status = getStatus(card);
                  return (
                    <tr key={card.id} onClick={() => openDetail(card)} className="hover:bg-indigo-50/30 cursor-pointer">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-50 px-2 py-0.5 rounded text-gray-700">{card.code}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatMXN(card.originalAmount)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatMXN(card.balance)}</td>
                      <td className="px-4 py-3 text-gray-700 hidden sm:table-cell">{card.recipientName || <span className="text-gray-400">&mdash;</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${status.className}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{new Date(card.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-md mx-4">
            {createdCode ? (
              <>
                <h2 className="text-base font-semibold mb-4">{t("giftCards.cardCreated")}</h2>
                <div className="bg-indigo-50 rounded-lg p-6 text-center mb-4">
                  <p className="text-xs text-gray-500 mb-2">{t("giftCards.cardCode")}</p>
                  <p className="text-3xl font-mono font-bold text-indigo-600 tracking-wider">{createdCode}</p>
                </div>
                <button onClick={() => { setShowCreateModal(false); setCreatedCode(null); }} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                  {t("common.confirm")}
                </button>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold mb-4">{t("giftCards.createGiftCard")}</h2>
                <div className="space-y-3">
                  <div>
                    <label className="admin-label">{t("giftCards.amount")} (MXN)</label>
                    <input type="number" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} className="admin-input" min="1" step="0.01" placeholder="500.00" />
                  </div>
                  <div>
                    <label className="admin-label">{t("giftCards.recipientName")}</label>
                    <input type="text" value={createForm.recipientName} onChange={(e) => setCreateForm({ ...createForm, recipientName: e.target.value })} className="admin-input" />
                  </div>
                  <div>
                    <label className="admin-label">{t("giftCards.recipientPhone")}</label>
                    <input type="text" value={createForm.recipientPhone} onChange={(e) => setCreateForm({ ...createForm, recipientPhone: e.target.value })} className="admin-input" />
                  </div>
                  <div>
                    <label className="admin-label">{t("giftCards.expiresAt")}</label>
                    <input type="date" value={createForm.expiresAt} onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })} className="admin-input" />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                    {t("common.cancel")}
                  </button>
                  <button onClick={handleCreate} disabled={!createForm.amount || parseFloat(createForm.amount) <= 0} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50">
                    {t("common.save")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Detail Panel Modal */}
      {(selectedCard || detailLoading) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            {detailLoading ? (
              <div className="text-center text-gray-400 py-8">{t("common.loading")}</div>
            ) : selectedCard ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold">{t("giftCards.giftCardDetail")}</h2>
                  <button onClick={() => setSelectedCard(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Card info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="text-center mb-3">
                    <span className="font-mono text-2xl font-bold text-indigo-600 tracking-wider">{selectedCard.code}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">{t("giftCards.originalAmount")}</span>
                      <p className="font-medium text-gray-900">{formatMXN(selectedCard.originalAmount)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">{t("giftCards.balance")}</span>
                      <p className="font-medium text-gray-900">{formatMXN(selectedCard.balance)}</p>
                    </div>
                    {selectedCard.recipientName && (
                      <div>
                        <span className="text-gray-500">{t("giftCards.recipientName")}</span>
                        <p className="font-medium text-gray-900">{selectedCard.recipientName}</p>
                      </div>
                    )}
                    {selectedCard.recipientPhone && (
                      <div>
                        <span className="text-gray-500">{t("giftCards.recipientPhone")}</span>
                        <p className="font-medium text-gray-900">{selectedCard.recipientPhone}</p>
                      </div>
                    )}
                    {selectedCard.expiresAt && (
                      <div>
                        <span className="text-gray-500">{t("giftCards.expiresAt")}</span>
                        <p className="font-medium text-gray-900">{new Date(selectedCard.expiresAt).toLocaleDateString()}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">{t("giftCards.status")}</span>
                      <p className="font-medium">
                        {(() => { const s = getStatus(selectedCard); return <span className={`text-xs px-2 py-0.5 rounded ${s.className}`}>{s.label}</span>; })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Usage history */}
                <h3 className="text-sm font-medium text-gray-700 mb-2">{t("giftCards.usageHistory")}</h3>
                <div className="flex-1 overflow-y-auto">
                  {selectedCard.usages.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">{t("giftCards.noUsages")}</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedCard.usages.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                          <div>
                            <p className="text-gray-700">{new Date(u.createdAt).toLocaleDateString()}</p>
                            {u.orderId && <p className="text-xs text-gray-400">{t("giftCards.orderNumber")} {u.orderId.slice(-6)}</p>}
                          </div>
                          <span className="font-medium text-red-600">-{formatMXN(u.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
