"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatMXN } from "@/lib/utils";

interface Category { id: string; name: string; nameEs: string; }
interface Modifier { id: string; name: string; nameEs: string; priceAdj: string; }
interface MenuItem { id: string; name: string; nameEs: string; description: string | null; descriptionEs: string | null; price: string; destination: string; categoryId: string; modifiers: Modifier[]; }
interface CartItem { menuItemId: string; name: string; quantity: number; notes: string; modifierIds: string[]; price: number; }

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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    const [catRes, itemRes] = await Promise.all([fetch("/api/menu/categories"), fetch("/api/menu/items")]);
    const { data: cats } = await catRes.json();
    const { data: menuItems } = await itemRes.json();
    setCategories(cats); setItems(menuItems);
    if (cats.length > 0) setSelectedCategory(cats[0].id);
  };

  const getName = (item: { name: string; nameEs: string }) => locale === "es" ? item.nameEs : item.name;
  const getDesc = (item: { description: string | null; descriptionEs: string | null }) => locale === "es" ? item.descriptionEs : item.description;
  const filteredItems = selectedCategory ? items.filter((i) => i.categoryId === selectedCategory) : items;

  const openItemSheet = (item: MenuItem) => { setSelectedItem(item); setQuantity(1); setNotes(""); setSelectedModifiers([]); };

  const addToCart = () => {
    if (!selectedItem) return;
    const modPriceAdj = selectedItem.modifiers.filter((m) => selectedModifiers.includes(m.id)).reduce((sum, m) => sum + Number(m.priceAdj), 0);
    setCart([...cart, { menuItemId: selectedItem.id, name: getName(selectedItem), quantity, notes, modifierIds: selectedModifiers, price: (Number(selectedItem.price) + modPriceAdj) * quantity }]);
    setSelectedItem(null);
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    await fetch(`/api/orders/${orderId}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity, notes: c.notes || undefined, modifierIds: c.modifierIds.length ? c.modifierIds : undefined })) }),
    });
    router.push(`/${locale}/tables/${orderId}`);
    router.refresh();
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price, 0);

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)]">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={() => router.push(`/${locale}/tables/${orderId}`)} className="text-blue-600 text-sm touch-manipulation">← {t("common.back")}</button>
        {cart.length > 0 && <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">{cart.length}</span>}
      </div>
      <div className="px-4 pb-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap touch-manipulation transition-colors ${selectedCategory === cat.id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 active:bg-gray-300"}`}>{getName(cat)}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <button key={item.id} onClick={() => openItemSheet(item)} className="bg-white rounded-xl p-3 border border-gray-100 text-left active:bg-gray-50 touch-manipulation">
              <div className="font-medium text-gray-800 text-sm">{getName(item)}</div>
              {getDesc(item) && <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{getDesc(item)}</div>}
              <div className="text-sm font-bold text-blue-600 mt-2">{formatMXN(Number(item.price))}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{item.destination === "KITCHEN" ? "🍳" : "🍹"} {item.destination === "KITCHEN" ? t("display.kitchen") : t("display.bar")}</div>
            </button>
          ))}
        </div>
      </div>
      {cart.length > 0 && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="text-sm text-gray-600 mb-2">{cart.map((c) => `${c.quantity}× ${c.name}`).join(", ")}</div>
          <button onClick={submitOrder} disabled={submitting} className="w-full h-14 rounded-xl bg-green-600 text-white font-semibold active:bg-green-700 touch-manipulation disabled:opacity-50 flex items-center justify-center gap-2">
            <span>{t("orders.submitOrder")}</span><span className="font-bold">{formatMXN(cartTotal)}</span>
          </button>
        </div>
      )}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedItem(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full bg-white rounded-t-2xl p-6 max-h-[70dvh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div><h3 className="text-lg font-bold text-gray-800">{getName(selectedItem)}</h3><p className="text-blue-600 font-bold">{formatMXN(Number(selectedItem.price))}</p></div>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 text-2xl touch-manipulation">✕</button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-700">{t("menu.quantity")}:</span>
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full bg-gray-200 text-lg font-bold touch-manipulation">−</button>
              <span className="text-lg font-bold w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-full bg-gray-200 text-lg font-bold touch-manipulation">+</button>
            </div>
            {selectedItem.modifiers.length > 0 && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700 block mb-2">{t("menu.modifiers")}:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.modifiers.map((mod) => {
                    const isSelected = selectedModifiers.includes(mod.id);
                    return (
                      <button key={mod.id} onClick={() => setSelectedModifiers(isSelected ? selectedModifiers.filter((id) => id !== mod.id) : [...selectedModifiers, mod.id])} className={`px-3 py-2 rounded-lg text-sm touch-manipulation border ${isSelected ? "bg-blue-100 border-blue-400 text-blue-800" : "bg-white border-gray-200 text-gray-700"}`}>
                        {getName(mod)}{Number(mod.priceAdj) > 0 && <span className="text-xs ml-1">+{formatMXN(Number(mod.priceAdj))}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mb-4"><input type="text" placeholder={t("orders.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-gray-300 text-sm" /></div>
            <button onClick={addToCart} className="w-full h-14 rounded-xl bg-blue-600 text-white font-semibold active:bg-blue-700 touch-manipulation">
              {t("menu.addToOrder")} — {formatMXN((Number(selectedItem.price) + selectedItem.modifiers.filter((m) => selectedModifiers.includes(m.id)).reduce((sum, m) => sum + Number(m.priceAdj), 0)) * quantity)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
