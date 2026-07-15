"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CupSoda,
  FlaskConical,
  Leaf,
  Minus,
  Pencil,
  Plus,
  ShoppingCart,
  Snowflake,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { parseJsonResponse } from "@/lib/api";
import {
  CATEGORY_UNIT_OPTIONS,
  DEFAULT_QUICK_INGREDIENTS,
  INGREDIENT_CATEGORIES,
  getDefaultUnit,
  type Ingredient,
  type IngredientCategory,
  type QuickIngredient,
  type RestockItem,
} from "@/lib/types";
import {
  defaultExpiryDateInput,
  formatDateInput,
  getExpiryColor,
  getExpiryLabel,
  getExpiryStatus,
  parseDateInput,
} from "@/lib/utils";
import { addDays } from "date-fns";
import {
  formatExpiryAlertItem,
  requestExpiryNotificationPermission,
  type ExpiryAlertItem,
} from "@/lib/expiryReminder";
import { useLocalStorage, useSync } from "@/lib/hooks";

const CATEGORY_META: Record<
  IngredientCategory,
  { icon: LucideIcon; bg: string; iconColor: string }
> = {
  生鲜: { icon: Leaf, bg: "bg-[#E8F5E9]", iconColor: "text-[#5A8F5A]" },
  冷冻: { icon: Snowflake, bg: "bg-[#E3F2FD]", iconColor: "text-[#5B8DB8]" },
  调料: { icon: FlaskConical, bg: "bg-[#FFF3E0]", iconColor: "text-[#C68A3E]" },
  零食饮料: { icon: CupSoda, bg: "bg-[#FCE4EC]", iconColor: "text-[#C75B7A]" },
};

function getQuantityStep(unit: string): number {
  if (unit === "克" || unit === "毫升") return 50;
  return 1;
}

export function FridgeModule() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [restock, setRestock] = useState<RestockItem[]>([]);
  const [expiring, setExpiring] = useState<ExpiryAlertItem[]>([]);
  const [notifyPermission, setNotifyPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [showAdd, setShowAdd] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [checkAnim, setCheckAnim] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] =
    useState<IngredientCategory | null>(null);
  const [quickAdding, setQuickAdding] = useState<number | null>(null);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [quickIngredients, setQuickIngredients] = useLocalStorage<
    QuickIngredient[]
  >("flavor-quick-ingredients", DEFAULT_QUICK_INGREDIENTS);
  const [quickDraft, setQuickDraft] = useState<QuickIngredient[]>([]);
  const [newIngredientIds, setNewIngredientIds] = useState<Set<string>>(
    () => new Set()
  );
  const [updatingQuantityId, setUpdatingQuantityId] = useState<string | null>(
    null
  );
  const [updatingExpiryId, setUpdatingExpiryId] = useState<string | null>(
    null
  );
  const [restockInput, setRestockInput] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "生鲜" as IngredientCategory,
    quantity: "1",
    unit: getDefaultUnit("生鲜"),
    expiryDate: defaultExpiryDateInput(),
  });

  const handleCategoryChange = (category: IngredientCategory) => {
    setForm((prev) => ({
      ...prev,
      category,
      unit: getDefaultUnit(category),
    }));
  };

  const load = useCallback(async () => {
    try {
      const [ingRes, restockRes, alertRes] = await Promise.all([
        fetch("/api/ingredients"),
        fetch("/api/restock"),
        fetch("/api/expiry-alert"),
      ]);
      setIngredients(await parseJsonResponse<Ingredient[]>(ingRes, []));
      setRestock(await parseJsonResponse<RestockItem[]>(restockRes, []));
      const alert = await parseJsonResponse<{ expiring: ExpiryAlertItem[] }>(
        alertRes,
        { expiring: [] }
      );
      setExpiring(alert.expiring || []);
    } catch (error) {
      console.error("加载冰箱数据失败", error);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifyPermission("unsupported");
      return;
    }
    setNotifyPermission(Notification.permission);
  }, []);

  useSync(load);

  const handleEnableNotify = async () => {
    const granted = await requestExpiryNotificationPermission();
    setNotifyPermission(
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported"
    );
    if (granted) {
      alert("已开启提醒，每天早上 7:00 会推送临期与过期食材通知。");
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.expiryDate) return;
    const expiryDate = parseDateInput(form.expiryDate);
    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        quantity: form.quantity,
        unit: form.unit,
        expiryDate: expiryDate.toISOString(),
      }),
    });

    if (!res.ok) {
      alert("添加失败，请稍后重试");
      return;
    }

    const ingredient = await parseJsonResponse<Ingredient | null>(res, null);
    if (ingredient?.id) {
      markIngredientAsNew(ingredient);
    }

    setForm({
      name: "",
      category: "生鲜",
      quantity: "1",
      unit: getDefaultUnit("生鲜"),
      expiryDate: defaultExpiryDateInput(),
    });
    setShowAdd(false);
    load();
  };

  const normalizeCategory = (category: string) =>
    category === "干货" ? "零食饮料" : category;

  const markIngredientAsNew = (ingredient: Ingredient) => {
    const category = normalizeCategory(ingredient.category) as IngredientCategory;
    setNewIngredientIds((prev) => new Set(prev).add(ingredient.id));
    setExpandedCategory(category);
  };

  const clearNewBadgesForCategory = (category: IngredientCategory) => {
    const ids = ingredients
      .filter(
        (i) => normalizeCategory(i.category) === category && i.quantity > 0
      )
      .map((i) => i.id);
    if (ids.length === 0) return;

    setNewIngredientIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const openQuickEdit = () => {
    setQuickDraft(quickIngredients.map((item) => ({ ...item })));
    setShowQuickEdit(true);
  };

  const updateQuickDraft = (
    index: number,
    patch: Partial<QuickIngredient>
  ) => {
    setQuickDraft((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        if (patch.category) {
          const units = CATEGORY_UNIT_OPTIONS[patch.category];
          if (!units.includes(next.unit)) {
            next.unit = getDefaultUnit(patch.category);
          }
        }
        return next;
      })
    );
  };

  const handleSaveQuickEdit = () => {
    const cleaned = quickDraft
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        addAmount: Number(item.addAmount) || 0,
      }))
      .filter((item) => item.name && item.addAmount > 0);

    if (cleaned.length === 0) {
      alert("请至少保留一个有效的快速添加食材");
      return;
    }

    setQuickIngredients(cleaned);
    setShowQuickEdit(false);
  };

  const handleQuickAdd = async (item: QuickIngredient, index: number) => {
    if (quickAdding !== null) return;

    setQuickAdding(index);
    const expiryDate = addDays(new Date(), 7).toISOString();

    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          category: item.category,
          quantity: item.addAmount,
          unit: item.unit,
          expiryDate,
        }),
      });

      if (!res.ok) {
        throw new Error("添加失败");
      }

      const ingredient = await parseJsonResponse<Ingredient | null>(res, null);
      if (ingredient?.id) {
        markIngredientAsNew(ingredient);
      }

      await load();
    } catch {
      alert(`添加「${item.name}」失败，请稍后重试`);
    } finally {
      setQuickAdding(null);
    }
  };

  const handleAddToRestock = async (ing: Ingredient) => {
    await fetch("/api/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ing.name, ingredientId: ing.id }),
    });
    load();
  };

  const handleUpdateQuantity = async (ing: Ingredient, nextQuantity: number) => {
    const quantity = Math.max(0, Number(nextQuantity));
    if (Number.isNaN(quantity) || quantity === ing.quantity) return;

    setUpdatingQuantityId(ing.id);
    try {
      const res = await fetch("/api/ingredients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ing.id, quantity }),
      });

      if (!res.ok) {
        throw new Error("更新失败");
      }

      if (quantity <= 0) {
        setNewIngredientIds((prev) => {
          const next = new Set(prev);
          next.delete(ing.id);
          return next;
        });
      }

      await load();
    } catch {
      alert(`更新「${ing.name}」数量失败，请稍后重试`);
    } finally {
      setUpdatingQuantityId(null);
    }
  };

  const handleUpdateExpiry = async (ing: Ingredient, dateValue: string) => {
    if (!dateValue) return;
    if (dateValue === formatDateInput(ing.expiryDate)) return;

    setUpdatingExpiryId(ing.id);
    try {
      const res = await fetch("/api/ingredients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ing.id,
          expiryDate: parseDateInput(dateValue).toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error("更新失败");
      }

      await load();
    } catch {
      alert(`更新「${ing.name}」到期时间失败，请稍后重试`);
    } finally {
      setUpdatingExpiryId(null);
    }
  };

  const handleToggleRestock = async (item: RestockItem) => {
    const willCheck = !item.checked;
    setCheckAnim(item.id);
    setTimeout(() => setCheckAnim(null), 500);
    await fetch("/api/restock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, checked: willCheck }),
    });
    await load();
    if (willCheck) {
      openAddFromRestock(item);
    }
  };

  const handleDeleteRestock = async (item: RestockItem) => {
    await fetch(`/api/restock?id=${item.id}`, { method: "DELETE" });
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/ingredients?id=${id}`, { method: "DELETE" });
    setNewIngredientIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    load();
  };

  const handleClearCategory = async (category: IngredientCategory) => {
    const group = grouped.find((g) => g.category === category);
    if (!group || group.items.length === 0) return;

    const confirmed = window.confirm(
      `确定清空「${category}」下的 ${group.items.length} 种食材吗？此操作不可撤销。`
    );
    if (!confirmed) return;

    await fetch(`/api/ingredients?category=${encodeURIComponent(category)}`, {
      method: "DELETE",
    });
    setExpandedCategory(null);
    load();
  };

  const grouped = INGREDIENT_CATEGORIES.map((cat) => ({
    category: cat,
    items: ingredients.filter(
      (i) => normalizeCategory(i.category) === cat && i.quantity > 0
    ),
  }));

  const pendingRestockCount = restock.filter((r) => !r.checked).length;

  const guessIngredientDefaults = (name: string, ingredientId?: string | null) => {
    let category: IngredientCategory = "生鲜";
    let unit = getDefaultUnit(category);

    if (ingredientId) {
      const linked = ingredients.find((i) => i.id === ingredientId);
      if (linked) {
        category = normalizeCategory(linked.category) as IngredientCategory;
        unit = linked.unit;
        return { category, unit };
      }
    }

    const existing = ingredients.find((i) => i.name === name);
    if (existing) {
      category = normalizeCategory(existing.category) as IngredientCategory;
      unit = existing.unit;
      return { category, unit };
    }

    const quick = quickIngredients.find((i) => i.name === name);
    if (quick) {
      return { category: quick.category, unit: quick.unit };
    }

    return { category, unit };
  };

  const openAddFromRestock = (item: RestockItem) => {
    const { category, unit } = guessIngredientDefaults(
      item.name,
      item.ingredientId
    );
    setForm({
      name: item.name,
      category,
      quantity: "1",
      unit,
      expiryDate: defaultExpiryDateInput(),
    });
    setShowRestock(false);
    setShowAdd(true);
  };

  const handleManualAddRestock = async () => {
    const name = restockInput.trim();
    if (!name) return;

    const res = await fetch("/api/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      alert("添加失败，请稍后重试");
      return;
    }

    setRestockInput("");
    load();
  };

  const toggleCategory = (category: IngredientCategory) => {
    setExpandedCategory((prev) => {
      const next = prev === category ? null : category;
      if (next === category) {
        clearNewBadgesForCategory(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {expiring.length > 0 && (
        <Card className="bg-[#E98B75]/10 border-[#E98B75]/30">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-[#E98B75] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-[#E98B75]">今日临期提醒</p>
              <p className="text-sm mt-1 text-[#4A3E3D]/80">
                {expiring.map(formatExpiryAlertItem).join("、")}
              </p>
              <p className="text-xs mt-1 text-[#4A3E3D]/50">
                每天早上 7:00 推送提醒
              </p>
              {notifyPermission === "default" && (
                <button
                  onClick={handleEnableNotify}
                  className="text-xs mt-2 text-[#E98B75] underline underline-offset-2 hover:text-[#d67560]"
                >
                  开启浏览器通知
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={() => setShowAdd(true)} className="flex-1">
          <Plus size={16} className="mr-1" /> 录入食材
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowRestock(true)}
          className="flex-1 relative"
        >
          <ShoppingCart size={16} className="mr-1" /> 补货清单
          {pendingRestockCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-[#E98B75] text-white text-xs font-semibold shadow-sm">
              {pendingRestockCount}
            </span>
          )}
        </Button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-[#4A3E3D]/70">快速添加</p>
          <button
            type="button"
            onClick={openQuickEdit}
            className="flex items-center gap-1 text-xs text-[#4A3E3D]/50 hover:text-[#4A3E3D] transition-colors px-2 py-1 rounded-xl hover:bg-[#E8DFD4]/50"
          >
            <Pencil size={12} />
            编辑
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickIngredients.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              type="button"
              disabled={quickAdding === index}
              onClick={() => handleQuickAdd(item, index)}
              className="px-3 py-2 bg-white border-2 border-[#E8DFD4] rounded-2xl text-sm hover:border-[#F7D070] hover:bg-[#F7D070]/10 transition-all disabled:opacity-50 text-left"
            >
              <span className="font-medium text-[#4A3E3D]">
                {quickAdding === index ? "添加中..." : `+ ${item.name}`}
              </span>
              <span className="block text-xs text-[#4A3E3D]/50 mt-0.5">
                {item.addAmount}
                {item.unit}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2 text-[#4A3E3D]/70">冰箱概览</p>
        <div className="grid grid-cols-2 gap-3">
          {grouped.map(({ category, items }) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            const isExpanded = expandedCategory === category;
            const urgentCount = items.filter(
              (i) => getExpiryStatus(i.expiryDate) === "urgent"
            ).length;
            const newCount = items.filter((i) =>
              newIngredientIds.has(i.id)
            ).length;

            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`text-left rounded-2xl border-2 p-4 transition-all ${
                  isExpanded
                    ? "border-[#F7D070] bg-[#F7D070]/15 shadow-sm"
                    : "border-[#E8DFD4] bg-white hover:border-[#F7D070]/60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${meta.bg}`}
                    >
                      <Icon size={24} className={meta.iconColor} />
                    </div>
                    {newCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#F7D070] text-[10px] font-semibold text-[#4A3E3D] shadow-sm animate-gentle-bounce">
                        {newCount > 1 ? newCount : "新"}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-[#4A3E3D]/40 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <p className="font-semibold mt-3 text-[#4A3E3D]">{category}</p>
                <p className="text-sm text-[#4A3E3D]/60 mt-0.5">
                  {items.length > 0 ? `${items.length} 种食材` : "暂无食材"}
                </p>
                {urgentCount > 0 && (
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-[#E98B75] text-white">
                    {urgentCount} 项临期
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {expandedCategory && (
        <div className="space-y-2">
          {(() => {
            const group = grouped.find((g) => g.category === expandedCategory);
            if (!group || group.items.length === 0) {
              return (
                <Card className="text-center py-6 text-[#4A3E3D]/50">
                  <p>{expandedCategory}还没有食材</p>
                  <p className="text-sm mt-1">点击「录入食材」添加吧</p>
                </Card>
              );
            }
            return (
              <>
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-medium text-[#4A3E3D]/70">
                    {expandedCategory} · {group.items.length} 种食材
                  </p>
                  <button
                    onClick={() => handleClearCategory(expandedCategory)}
                    className="flex items-center gap-1 text-sm text-[#E98B75] hover:text-[#d67560] transition-colors px-2 py-1 rounded-xl hover:bg-[#E98B75]/10"
                  >
                    <Trash2 size={14} />
                    一键清空
                  </button>
                </div>
                {group.items.map((ing) => {
                  const status = getExpiryStatus(ing.expiryDate);
                  const isNew = newIngredientIds.has(ing.id);
                  return (
                    <Card
                      key={ing.id}
                      className={`flex items-center justify-between gap-3 ${
                        isNew ? "border-[#F7D070] bg-[#F7D070]/10" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ing.name}</span>
                          {isNew && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F7D070] text-[#4A3E3D] font-medium">
                              新
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getExpiryColor(status)}`}
                          >
                            {getExpiryLabel(status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={updatingQuantityId === ing.id}
                              onClick={() =>
                                handleUpdateQuantity(
                                  ing,
                                  ing.quantity - getQuantityStep(ing.unit)
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E8DFD4] bg-white hover:border-[#F7D070] hover:bg-[#F7D070]/10 transition-colors disabled:opacity-50"
                              title="减少"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step={getQuantityStep(ing.unit)}
                              key={`${ing.id}-${ing.quantity}`}
                              defaultValue={ing.quantity}
                              disabled={updatingQuantityId === ing.id}
                              onBlur={(e) =>
                                handleUpdateQuantity(ing, Number(e.target.value))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-16 px-2 py-1 text-sm text-center rounded-lg border border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none disabled:opacity-50"
                            />
                            <button
                              type="button"
                              disabled={updatingQuantityId === ing.id}
                              onClick={() =>
                                handleUpdateQuantity(
                                  ing,
                                  ing.quantity + getQuantityStep(ing.unit)
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E8DFD4] bg-white hover:border-[#F7D070] hover:bg-[#F7D070]/10 transition-colors disabled:opacity-50"
                              title="增加"
                            >
                              <Plus size={14} />
                            </button>
                            <span className="text-sm text-[#4A3E3D]/60 ml-0.5">
                              {ing.unit}
                            </span>
                          </div>
                          <label className="flex items-center gap-1 text-sm text-[#4A3E3D]/60 shrink-0">
                            <span className="text-[#4A3E3D]/40">· 到期</span>
                            <input
                              type="date"
                              key={`${ing.id}-${ing.expiryDate}`}
                              defaultValue={formatDateInput(ing.expiryDate)}
                              disabled={
                                updatingExpiryId === ing.id ||
                                updatingQuantityId === ing.id
                              }
                              onChange={(e) =>
                                handleUpdateExpiry(ing, e.target.value)
                              }
                              className="px-2 py-0.5 text-sm rounded-lg border border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none disabled:opacity-50"
                            />
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleAddToRestock(ing)}
                          className="p-2 rounded-xl hover:bg-[#F7D070]/20 transition-colors"
                          title="加入推车"
                        >
                          <ShoppingCart size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(ing.id)}
                          className="p-2 rounded-xl hover:bg-[#E98B75]/20 text-[#E98B75] transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </>
            );
          })()}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="录入食材">
        <div className="space-y-3">
          <input
            className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
            placeholder="食材名称"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
            value={form.category}
            onChange={(e) =>
              handleCategoryChange(e.target.value as IngredientCategory)
            }
          >
            {INGREDIENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
              placeholder="数量"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            <select
              className="w-24 px-3 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              {CATEGORY_UNIT_OPTIONS[form.category].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-[#4A3E3D]/60">保质期</label>
            <input
              type="date"
              className="w-full mt-1 px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {[3, 7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() =>
                    setForm({ ...form, expiryDate: defaultExpiryDateInput(days) })
                  }
                  className="px-3 py-1 rounded-xl text-xs font-medium bg-[#E8DFD4]/60 text-[#4A3E3D] hover:bg-[#F7D070]/40 transition-colors"
                >
                  {days} 天
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleAdd} className="w-full">
            确认添加
          </Button>
        </div>
      </Modal>

      <Modal
        open={showQuickEdit}
        onClose={() => setShowQuickEdit(false)}
        title="编辑快速添加"
      >
        <div className="space-y-3">
          {quickDraft.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="p-3 rounded-2xl border-2 border-[#E8DFD4] bg-white space-y-2"
            >
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none text-sm"
                  placeholder="食材名称"
                  value={item.name}
                  onChange={(e) =>
                    updateQuickDraft(index, { name: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuickDraft((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="p-2 rounded-xl text-[#E98B75] hover:bg-[#E98B75]/10 transition-colors"
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 rounded-xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none text-sm"
                  value={item.category}
                  onChange={(e) =>
                    updateQuickDraft(index, {
                      category: e.target.value as IngredientCategory,
                    })
                  }
                >
                  {INGREDIENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-2 rounded-xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none text-sm"
                  value={item.addAmount}
                  onChange={(e) =>
                    updateQuickDraft(index, {
                      addAmount: Number(e.target.value),
                    })
                  }
                />
                <select
                  className="w-20 px-2 py-2 rounded-xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none text-sm"
                  value={item.unit}
                  onChange={(e) =>
                    updateQuickDraft(index, { unit: e.target.value })
                  }
                >
                  {CATEGORY_UNIT_OPTIONS[item.category].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() =>
              setQuickDraft((prev) => [
                ...prev,
                {
                  name: "",
                  category: "生鲜",
                  unit: getDefaultUnit("生鲜"),
                  addAmount: 500,
                },
              ])
            }
          >
            <Plus size={16} className="mr-1" />
            添加食材
          </Button>
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setQuickDraft(DEFAULT_QUICK_INGREDIENTS.map((i) => ({ ...i })))}
            >
              恢复默认
            </Button>
            <Button className="flex-1" onClick={handleSaveQuickEdit}>
              保存
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showRestock}
        onClose={() => setShowRestock(false)}
        title="补货清单"
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none text-sm"
              placeholder="输入待补货食材"
              value={restockInput}
              onChange={(e) => setRestockInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleManualAddRestock();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleManualAddRestock}
              disabled={!restockInput.trim()}
            >
              添加
            </Button>
          </div>

          {restock.length === 0 ? (
            <p className="text-center text-[#4A3E3D]/50 py-4">清单是空的，真棒！</p>
          ) : (
            restock.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                  item.checked
                    ? "border-[#E8DFD4] bg-[#E8DFD4]/30 opacity-60"
                    : "border-[#E8DFD4] bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleRestock(item)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  title={item.checked ? "取消勾选" : "标记已买到"}
                >
                  <span
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      item.checked
                        ? "border-[#E98B75] bg-[#E98B75] text-white"
                        : "border-[#E8DFD4] hover:border-[#F7D070]"
                    }`}
                  >
                    {item.checked && (
                      <span
                        className={`text-sm ${checkAnim === item.id ? "animate-heart-check" : ""}`}
                      >
                        ❤️
                      </span>
                    )}
                  </span>
                  <span
                    className={`truncate ${item.checked ? "line-through text-[#4A3E3D]/60" : ""}`}
                  >
                    {item.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRestock(item)}
                  className="p-2 rounded-xl text-[#E98B75] hover:bg-[#E98B75]/10 transition-colors shrink-0"
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
