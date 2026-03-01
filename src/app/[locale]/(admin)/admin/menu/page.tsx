"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmModal from "@/components/common/ConfirmModal";

interface Modifier {
  id: string;
  name: string;
  nameEs: string;
  priceAdj: number;
}

interface IngredientOption {
  id: string;
  name: string;
  nameEs: string;
  unit: string;
}

interface MenuItemIngredient {
  ingredientId: string;
  quantity: number;
  ingredient: IngredientOption;
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
  available: boolean;
  modifiers: Modifier[];
  ingredients?: MenuItemIngredient[];
}

interface Category {
  id: string;
  name: string;
  nameEs: string;
  sortOrder: number;
  items: MenuItem[];
}

interface ItemIngredientRow {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantity: string;
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
  const [itemIngredients, setItemIngredients] = useState<ItemIngredientRow[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "cat" | "item"; id: string } | null>(null);

  // Available ingredients from inventory
  const [availableIngredients, setAvailableIngredients] = useState<IngredientOption[]>([]);

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

  async function fetchIngredients() {
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const json = await res.json();
        setAvailableIngredients(json.data || []);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchCategories();
    fetchIngredients();
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
      ingredients: itemIngredients
        .filter((i) => i.ingredientId && parseFloat(i.quantity) > 0)
        .map((i) => ({
          ingredientId: i.ingredientId,
          quantity: parseFloat(i.quantity),
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
    setItemIngredients([]);
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
    setItemIngredients(
      (item.ingredients || []).map((ing) => ({
        ingredientId: ing.ingredientId,
        ingredientName: ing.ingredient.name,
        unit: ing.ingredient.unit,
        quantity: String(ing.quantity),
      }))
    );
    setShowItemForm(true);
  }

  async function deleteItem(id: string) {
    await fetch(`/api/menu/items/${id}`, { method: "DELETE" });
    fetchCategories();
  }

  async function toggleAvailability(item: MenuItem) {
    await fetch(`/api/menu/items/${item.id}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    fetchCategories();
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "cat") await deleteCat(deleteTarget.id);
    else await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
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

  // Ingredient helpers
  function addIngredientRow() {
    setItemIngredients([...itemIngredients, { ingredientId: "", ingredientName: "", unit: "", quantity: "" }]);
  }

  function removeIngredientRow(idx: number) {
    setItemIngredients(itemIngredients.filter((_, i) => i !== idx));
  }

  function updateIngredientRow(idx: number, ingredientId: string) {
    const ing = availableIngredients.find((a) => a.id === ingredientId);
    if (!ing) return;
    const updated = [...itemIngredients];
    updated[idx] = {
      ingredientId: ing.id,
      ingredientName: ing.name,
      unit: ing.unit,
      quantity: updated[idx].quantity,
    };
    setItemIngredients(updated);
  }

  function updateIngredientQuantity(idx: number, quantity: string) {
    const updated = [...itemIngredients];
    updated[idx] = { ...updated[idx], quantity };
    setItemIngredients(updated);
  }

  // Filter out already-selected ingredients from dropdown
  const selectedIngredientIds = new Set(itemIngredients.map((i) => i.ingredientId));

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {t("admin.manageMenu")}
        </h1>
        <button
          onClick={() => {
            resetCatForm();
            setShowCatForm(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
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
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => startEditCat(activeCategory)}
              className="text-sm px-3 py-1.5 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg font-medium transition-colors"
            >
              Edit Category
            </button>
            <button
              onClick={() => setDeleteTarget({ type: "cat", id: activeCategory.id })}
              className="text-sm px-3 py-1.5 bg-white text-red-600 border border-gray-200 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              Delete Category
            </button>
          </div>
          <button
            onClick={() => {
              resetItemForm();
              setShowItemForm(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
          >
            + {t("admin.addItem")}
          </button>
        </div>
      )}

      {/* Items list */}
      {activeCategory && (
        <div className="space-y-3">
          {activeCategory.items.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              {t("menu.noItems")}
            </div>
          ) : (
            activeCategory.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                      {!item.available && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          86&apos;d
                        </span>
                      )}
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
                    {item.ingredients && item.ingredients.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.ingredients.map((ing) => (
                          <span
                            key={ing.ingredientId}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs"
                          >
                            {ing.ingredient.name} ({Number(ing.quantity)}{ing.ingredient.unit})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      onClick={() => toggleAvailability(item)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                        item.available
                          ? "border-green-300 text-green-700 hover:bg-green-50"
                          : "border-red-300 text-red-700 hover:bg-red-50"
                      }`}
                    >
                      {item.available ? t("menu86.available") : t("menu86.unavailable")}
                    </button>
                    <button
                      onClick={() => startEditItem(item)}
                      className="text-sm px-3 py-1.5 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ type: "item", id: item.id })}
                      className="text-sm px-3 py-1.5 bg-white text-red-600 border border-gray-200 hover:bg-red-50 rounded-lg font-medium transition-colors"
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
          <div className="bg-white rounded-lg p-5 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold mb-4">
              {editingCatId ? "Edit Category" : t("admin.addCategory")}
            </h2>
            <form onSubmit={handleCatSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Name (EN)
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Nombre (ES)
                </label>
                <input
                  type="text"
                  value={catNameEs}
                  onChange={(e) => setCatNameEs(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatForm(false)}
                  className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
          <div className="bg-white rounded-lg p-5 w-full max-w-lg mx-4">
            <h2 className="text-base font-semibold mb-4">
              {editingItemId ? "Edit Item" : t("admin.addItem")}
            </h2>
            <form onSubmit={handleItemSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Name (EN)
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Nombre (ES)
                  </label>
                  <input
                    type="text"
                    value={itemNameEs}
                    onChange={(e) => setItemNameEs(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Description (EN)
                  </label>
                  <input
                    type="text"
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Descripcion (ES)
                  </label>
                  <input
                    type="text"
                    value={itemDescEs}
                    onChange={(e) => setItemDescEs(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    {t("menu.price", { price: "" })} (MXN)
                  </label>
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    {t("admin.destination")}
                  </label>
                  <select
                    value={itemDest}
                    onChange={(e) =>
                      setItemDest(e.target.value as "KITCHEN" | "BAR")
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  >
                    <option value="KITCHEN">{t("display.kitchen")}</option>
                    <option value="BAR">{t("display.bar")}</option>
                  </select>
                </div>
              </div>

              {/* Modifiers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("menu.modifiers")}
                  </label>
                  <button
                    type="button"
                    onClick={addModifier}
                    className="text-sm text-gray-700 hover:text-gray-900 font-medium"
                  >
                    + Add
                  </button>
                </div>
                {itemModifiers.map((mod, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 mb-2 items-center">
                    <input
                      type="text"
                      placeholder="EN name"
                      value={mod.name}
                      onChange={(e) =>
                        updateModifier(idx, "name", e.target.value)
                      }
                      required
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="ES nombre"
                      value={mod.nameEs}
                      onChange={(e) =>
                        updateModifier(idx, "nameEs", e.target.value)
                      }
                      required
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="+$"
                      value={mod.priceAdj}
                      onChange={(e) =>
                        updateModifier(idx, "priceAdj", e.target.value)
                      }
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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

              {/* Ingredients per Serving */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("menu.ingredientsPerServing")}
                  </label>
                  <button
                    type="button"
                    onClick={addIngredientRow}
                    className="text-sm text-gray-700 hover:text-gray-900 font-medium"
                  >
                    + {t("menu.addIngredient")}
                  </button>
                </div>
                {itemIngredients.length === 0 && (
                  <p className="text-xs text-gray-400 mb-2">{t("menu.noIngredientsLinked")}</p>
                )}
                {itemIngredients.map((row, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 mb-2 items-center">
                    <select
                      value={row.ingredientId}
                      onChange={(e) => updateIngredientRow(idx, e.target.value)}
                      required
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">{t("menu.selectIngredient")}</option>
                      {availableIngredients
                        .filter((a) => a.id === row.ingredientId || !selectedIngredientIds.has(a.id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.unit})
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      placeholder={t("inventory.quantityPerServing")}
                      value={row.quantity}
                      onChange={(e) => updateIngredientQuantity(idx, e.target.value)}
                      required
                      min="0.001"
                      step="0.001"
                      className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {row.unit && (
                      <span className="text-xs text-gray-500 w-8">{row.unit}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(idx)}
                      className="text-red-500 hover:text-red-700 text-lg px-1"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
                  className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={t("common.confirm")}
        message={t("common.areYouSure")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
