"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface Modifier {
  id: string;
  name: string;
  nameEs: string;
  priceAdj: number;
}

interface MenuItem {
  id: string;
  name: string;
  nameEs: string;
  description: string | null;
  descriptionEs: string | null;
  price: number;
  destination: "KITCHEN" | "BAR";
  isActive: boolean;
  modifiers: Modifier[];
}

interface Category {
  id: string;
  name: string;
  nameEs: string;
  sortOrder: number;
  items: MenuItem[];
}

export default function ManageMenuPage() {
  const t = useTranslations();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catNameEs, setCatNameEs] = useState("");
  const [catSortOrder, setCatSortOrder] = useState("1");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemNameEs, setItemNameEs] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemDescEs, setItemDescEs] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDest, setItemDest] = useState<"KITCHEN" | "BAR">("KITCHEN");
  const [itemModifiers, setItemModifiers] = useState<
    { name: string; nameEs: string; priceAdj: string }[]
  >([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function fetchCategories() {
    const res = await fetch("/api/menu/categories");
    if (res.ok) {
      const json = await res.json();
      const cats = json.data || json;
      setCategories(cats);
      if (!activeTab && cats.length > 0) setActiveTab(cats[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  // Category CRUD
  async function handleCatSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editingCatId
      ? `/api/menu/categories/${editingCatId}`
      : "/api/menu/categories";
    const method = editingCatId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: catName,
        nameEs: catNameEs,
        sortOrder: parseInt(catSortOrder),
      }),
    });
    if (res.ok) {
      setShowCatForm(false);
      resetCatForm();
      fetchCategories();
    }
    setSaving(false);
  }

  function resetCatForm() {
    setCatName("");
    setCatNameEs("");
    setCatSortOrder("1");
    setEditingCatId(null);
  }

  function startEditCat(cat: Category) {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatNameEs(cat.nameEs);
    setCatSortOrder(cat.sortOrder.toString());
    setShowCatForm(true);
  }

  async function deleteCat(id: string) {
    if (!confirm(t("common.confirm") + "?")) return;
    await fetch(`/api/menu/categories/${id}`, { method: "DELETE" });
    fetchCategories();
  }

  // Item CRUD
  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTab) return;
    setSaving(true);

    const url = editingItemId
      ? `/api/menu/items/${editingItemId}`
      : "/api/menu/items";
    const method = editingItemId ? "PUT" : "POST";

    const body: Record<string, unknown> = {
      name: itemName,
      nameEs: itemNameEs,
      description: itemDesc || null,
      descriptionEs: itemDescEs || null,
      price: parseFloat(itemPrice),
      destination: itemDest,
      categoryId: activeTab,
      modifiers: itemModifiers.map((m) => ({
        name: m.name,
        nameEs: m.nameEs,
        priceAdj: parseFloat(m.priceAdj) || 0,
      })),
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowItemForm(false);
      resetItemForm();
      fetchCategories();
    }
    setSaving(false);
  }

  function resetItemForm() {
    setItemName("");
    setItemNameEs("");
    setItemDesc("");
    setItemDescEs("");
    setItemPrice("");
    setItemDest("KITCHEN");
    setItemModifiers([]);
    setEditingItemId(null);
  }

  function startEditItem(item: MenuItem) {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemNameEs(item.nameEs);
    setItemDesc(item.description || "");
    setItemDescEs(item.descriptionEs || "");
    setItemPrice(String(item.price));
    setItemDest(item.destination);
    setItemModifiers(
      item.modifiers.map((m) => ({
        name: m.name,
        nameEs: m.nameEs,
        priceAdj: String(m.priceAdj),
      }))
    );
    setShowItemForm(true);
  }

  async function deleteItem(id: string) {
    if (!confirm(t("common.confirm") + "?")) return;
    await fetch(`/api/menu/items/${id}`, { method: "DELETE" });
    fetchCategories();
  }

  function addModifier() {
    setItemModifiers([...itemModifiers, { name: "", nameEs: "", priceAdj: "0" }]);
  }

  function removeModifier(idx: number) {
    setItemModifiers(itemModifiers.filter((_, i) => i !== idx));
  }

  function updateModifier(
    idx: number,
    field: "name" | "nameEs" | "priceAdj",
    value: string
  ) {
    const updated = [...itemModifiers];
    updated[idx] = { ...updated[idx], [field]: value };
    setItemModifiers(updated);
  }

  const activeCategory = categories.find((c) => c.id === activeTab);

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
          {t("admin.manageMenu")}
        </h1>
        <button
          onClick={() => {
            resetCatForm();
            setShowCatForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + {t("admin.addCategory")}
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === cat.id
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {cat.name} / {cat.nameEs}
            <span className="ml-2 text-xs opacity-75">
              ({cat.items.length})
            </span>
          </button>
        ))}
      </div>

      {/* Active category controls */}
      {activeCategory && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => startEditCat(activeCategory)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Edit Category
            </button>
            <button
              onClick={() => deleteCat(activeCategory.id)}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Delete Category
            </button>
          </div>
          <button
            onClick={() => {
              resetItemForm();
              setShowItemForm(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            + {t("admin.addItem")}
          </button>
        </div>
      )}

      {/* Items list */}
      {activeCategory && (
        <div className="space-y-3">
          {activeCategory.items.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500">
              {t("menu.noItems")}
            </div>
          ) : (
            activeCategory.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm p-5 border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {item.name}
                      </h3>
                      <span className="text-sm text-gray-500">
                        / {item.nameEs}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.destination === "KITCHEN"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {item.destination === "KITCHEN"
                          ? t("display.kitchen")
                          : t("display.bar")}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      ${Number(item.price).toFixed(2)} MXN
                    </p>
                    {item.modifiers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.modifiers.map((mod) => (
                          <span
                            key={mod.id}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {mod.name}
                            {Number(mod.priceAdj) > 0 &&
                              ` (+$${Number(mod.priceAdj).toFixed(2)})`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEditItem(item)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Category form modal */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">
              {editingCatId ? "Edit Category" : t("admin.addCategory")}
            </h2>
            <form onSubmit={handleCatSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (EN)
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre (ES)
                </label>
                <input
                  type="text"
                  value={catNameEs}
                  onChange={(e) => setCatNameEs(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatForm(false)}
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

      {/* Item form modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold mb-4">
              {editingItemId ? "Edit Item" : t("admin.addItem")}
            </h2>
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (EN)
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre (ES)
                  </label>
                  <input
                    type="text"
                    value={itemNameEs}
                    onChange={(e) => setItemNameEs(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (EN)
                  </label>
                  <input
                    type="text"
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripcion (ES)
                  </label>
                  <input
                    type="text"
                    value={itemDescEs}
                    onChange={(e) => setItemDescEs(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("menu.price", { price: "" })} (MXN)
                  </label>
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("admin.destination")}
                  </label>
                  <select
                    value={itemDest}
                    onChange={(e) =>
                      setItemDest(e.target.value as "KITCHEN" | "BAR")
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="KITCHEN">{t("display.kitchen")}</option>
                    <option value="BAR">{t("display.bar")}</option>
                  </select>
                </div>
              </div>

              {/* Modifiers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t("menu.modifiers")}
                  </label>
                  <button
                    type="button"
                    onClick={addModifier}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add
                  </button>
                </div>
                {itemModifiers.map((mod, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <input
                      type="text"
                      placeholder="EN name"
                      value={mod.name}
                      onChange={(e) =>
                        updateModifier(idx, "name", e.target.value)
                      }
                      required
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900"
                    />
                    <input
                      type="text"
                      placeholder="ES nombre"
                      value={mod.nameEs}
                      onChange={(e) =>
                        updateModifier(idx, "nameEs", e.target.value)
                      }
                      required
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900"
                    />
                    <input
                      type="number"
                      placeholder="+$"
                      value={mod.priceAdj}
                      onChange={(e) =>
                        updateModifier(idx, "priceAdj", e.target.value)
                      }
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900"
                      step="0.01"
                    />
                    <button
                      type="button"
                      onClick={() => removeModifier(idx)}
                      className="text-red-500 hover:text-red-700 text-lg px-1"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
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
    </div>
  );
}
