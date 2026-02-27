"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatMXN } from "@/lib/utils";
import { SkeletonMenuItems } from "@/components/common/Skeleton";

interface Category { id: string; name: string; nameEs: string; }
interface Modifier { id: string; name: string; nameEs: string; priceAdj: string; }
interface MenuItem { id: string; name: string; nameEs: string; description: string | null; descriptionEs: string | null; price: string; destination: string; categoryId: string; modifiers: Modifier[]; }
interface CartItem { menuItemId: string; name: string; quantity: number; notes: string; modifierIds: string[]; price: number; seatNumber: number | null; }

export default function MenuBrowserPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSeats, setTableSeats] = useState(0);

  useEffect(() => { fetchMenu(); fetchTableSeats(); }, []);

  const fetchMenu = async () => {
    const [catRes, itemRes] = await Promise.all([fetch("/api/menu/categories"), fetch("/api/menu/items")]);
    const { data: cats } = await catRes.json();
    const { data: menuItems } = await itemRes.json();
    setCategories(cats); setItems(menuItems);
    if (cats.length > 0) setSelectedCategory(cats[0].id);
    setLoading(false);
  };

  const fetchTableSeats = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const { data } = await res.json();
      if (data?.table?.seats) setTableSeats(data.table.seats);
    } catch { /* ignore */ }
  };

  const getName = (item: { name: string; nameEs: string }) => locale === "es" ? item.nameEs : item.name;
  const getDesc = (item: { description: string | null; descriptionEs: string | null }) => locale === "es" ? item.descriptionEs : item.description;

  const isSearching = searchQuery.trim().length > 0;
  const filteredItems = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.toLowerCase();
      return items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.nameEs.toLowerCase().includes(q)
      );
    }
    return selectedCategory ? items.filter((i) => i.categoryId === selectedCategory) : items;
  }, [isSearching, searchQuery, selectedCategory, items]);

  const openItemSheet = (item: MenuItem) => { setSelectedItem(item); setQuantity(1); setNotes(""); setSelectedModifiers([]); setSeatNumber(null); };

  // Calculate live price preview for the modal
  const modalPrice = useMemo(() => {
    if (!selectedItem) return 0;
    const modPriceAdj = selectedItem.modifiers
      .filter((m) => selectedModifiers.includes(m.id))
      .reduce((sum, m) => sum + Number(m.priceAdj), 0);
    return (Number(selectedItem.price) + modPriceAdj) * quantity;
  }, [selectedItem, selectedModifiers, quantity]);

  const addToCart = () => {
    if (!selectedItem) return;
    setCart([...cart, {
      menuItemId: selectedItem.id,
      name: getName(selectedItem),
      quantity,
      notes,
      modifierIds: selectedModifiers,
      price: modalPrice,
      seatNumber,
    }]);
    setSelectedItem(null);
  };

  const clearCart = () => { setCart([]); };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    await fetch(`/api/orders/${orderId}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          notes: c.notes || undefined,
          modifierIds: c.modifierIds.length ? c.modifierIds : undefined,
          seatNumber: c.seatNumber,
        })),
      }),
    });
    router.push(`/${locale}/tables/${orderId}`);
    router.refresh();
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price, 0);

  const itemsGrid = (
    <>
      {loading ? (
        <SkeletonMenuItems />
      ) : filteredItems.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          {isSearching ? t("menu.noSearchResults") : t("menu.noItems")}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => openItemSheet(item)}
              className="bg-white rounded-xl p-4 border border-gray-100 text-left active:bg-gray-50 touch-manipulation transition-colors"
            >
              <div className="font-medium text-gray-800 text-sm">{getName(item)}</div>
              {getDesc(item) && <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{getDesc(item)}</div>}
              <div className="text-sm font-bold text-blue-600 mt-2">{formatMXN(Number(item.price))}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {item.destination === "KITCHEN" ? "🍳" : "🍹"}{" "}
                {item.destination === "KITCHEN" ? t("display.kitchen") : t("display.bar")}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => router.push(`/${locale}/tables/${orderId}`)}
          className="h-10 px-3 flex items-center gap-1 text-blue-600 font-medium rounded-lg active:bg-blue-50 touch-manipulation transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("common.back")}
        </button>
        {cart.length > 0 && (
          <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {cart.length}
          </span>
        )}
      </div>

      {/* Search bar */}
      <div className="px-4 pb-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("menu.searchPlaceholder")}
            className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 touch-manipulation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category + Items layout */}
      {!isSearching ? (
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Sidebar categories (tablet+) */}
          <div className="hidden sm:flex flex-col w-1/4 min-w-[140px] max-w-[200px] border-r border-gray-200 overflow-y-auto px-2 py-2 gap-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-3 py-3.5 rounded-xl text-sm font-medium touch-manipulation transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 active:bg-gray-100 border border-gray-100"
                }`}
              >
                {getName(cat)}
              </button>
            ))}
          </div>

          {/* Horizontal tabs (mobile only) */}
          <div className="sm:hidden flex-shrink-0">
            <div className="px-4 pb-2 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap touch-manipulation transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 active:bg-gray-300"
                    }`}
                  >
                    {getName(cat)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items grid */}
          <div className="flex-1 overflow-auto px-4 pb-4">
            {itemsGrid}
          </div>
        </div>
      ) : (
        /* When searching, show full-width items grid */
        <div className="flex-1 overflow-auto px-4 pb-4">
          {itemsGrid}
        </div>
      )}

      {/* Cart footer */}
      {cart.length > 0 && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600 flex-1 truncate">
              {cart.map((c) => `${c.quantity}x ${c.name}${c.seatNumber ? ` (S${c.seatNumber})` : ""}`).join(", ")}
            </div>
            <button
              onClick={clearCart}
              className="h-8 px-3 text-xs text-red-600 font-medium rounded-lg active:bg-red-50 touch-manipulation ml-2 whitespace-nowrap"
            >
              {t("menu.clearCart")}
            </button>
          </div>
          <button
            onClick={submitOrder}
            disabled={submitting}
            className="w-full h-14 rounded-xl bg-green-600 text-white font-semibold active:bg-green-700 touch-manipulation disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            <span>{t("orders.submitOrder")}</span>
            <span className="font-bold">{formatMXN(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Item detail bottom sheet */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedItem(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full bg-white rounded-t-2xl p-6 max-h-[80dvh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{getName(selectedItem)}</h3>
                <p className="text-blue-600 font-bold">{formatMXN(Number(selectedItem.price))}</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 touch-manipulation"
                aria-label={t("common.cancel")}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-700">{t("menu.quantity")}:</span>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 rounded-full bg-gray-200 text-lg font-bold touch-manipulation active:bg-gray-300 transition-colors"
              >
                -
              </button>
              <span className="text-xl font-bold w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-full bg-gray-200 text-lg font-bold touch-manipulation active:bg-gray-300 transition-colors"
              >
                +
              </button>
            </div>

            {/* Seat number (optional) */}
            {tableSeats > 0 && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700 block mb-2">{t("orders.seatNumber")}:</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSeatNumber(null)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium touch-manipulation border transition-colors ${
                      seatNumber === null
                        ? "bg-blue-100 border-blue-400 text-blue-800"
                        : "bg-white border-gray-200 text-gray-600 active:bg-gray-50"
                    }`}
                  >
                    {t("orders.noSeat")}
                  </button>
                  {Array.from({ length: tableSeats }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setSeatNumber(num)}
                      className={`w-12 h-12 rounded-lg text-sm font-medium touch-manipulation border transition-colors ${
                        seatNumber === num
                          ? "bg-purple-100 border-purple-400 text-purple-800"
                          : "bg-white border-gray-200 text-gray-600 active:bg-gray-50"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modifiers */}
            {selectedItem.modifiers.length > 0 && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700 block mb-2">{t("menu.modifiers")}:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.modifiers.map((mod) => {
                    const isSelected = selectedModifiers.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        onClick={() => setSelectedModifiers(isSelected ? selectedModifiers.filter((id) => id !== mod.id) : [...selectedModifiers, mod.id])}
                        className={`px-4 py-2.5 rounded-lg text-sm touch-manipulation border transition-colors ${
                          isSelected
                            ? "bg-blue-100 border-blue-400 text-blue-800"
                            : "bg-white border-gray-200 text-gray-700 active:bg-gray-50"
                        }`}
                      >
                        {getName(mod)}
                        {Number(mod.priceAdj) > 0 && (
                          <span className="text-xs ml-1">+{formatMXN(Number(mod.priceAdj))}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-4">
              <input
                type="text"
                placeholder={t("menu.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-300 text-sm"
              />
            </div>

            {/* Add to order button with live price */}
            <button
              onClick={addToCart}
              className="w-full h-14 rounded-xl bg-blue-600 text-white font-semibold active:bg-blue-700 touch-manipulation transition-colors"
            >
              {t("menu.addToOrder")} — {formatMXN(modalPrice)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
