"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CupSoda,
  FlaskConical,
  Leaf,
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
  INGREDIENT_CATEGORIES,
  QUICK_INGREDIENTS,
  getDefaultUnit,
  type Ingredient,
  type IngredientCategory,
  type RestockItem,
} from "@/lib/types";
import {
  formatDate,
  getExpiryColor,
  getExpiryLabel,
  getExpiryStatus,
} from "@/lib/utils";
import { addDays } from "date-fns";
import {
  formatExpiryAlertItem,
  requestExpiryNotificationPermission,
  type ExpiryAlertItem,
} from "@/lib/expiryReminder";
import { useSync } from "@/lib/hooks";

const CATEGORY_META: Record<
  IngredientCategory,
  { icon: LucideIcon; bg: string; iconColor: string }
> = {
  生鲜: { icon: Leaf, bg: "bg-[#E8F5E9]", iconColor: "text-[#5A8F5A]" },
  冷冻: { icon: Snowflake, bg: "bg-[#E3F2FD]", iconColor: "text-[#5B8DB8]" },
  调料: { icon: FlaskConical, bg: "bg-[#FFF3E0]", iconColor: "text-[#C68A3E]" },
  零食饮料: { icon: CupSoda, bg: "bg-[#FCE4EC]", iconColor: "text-[#C75B7A]" },
};

export function FridgeModule() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [restock, setRestock] = useState<RestockItem[]>([]);
  const [expiring, setExpiring] = useState<ExpiryAlertItem[]>([]);
  const [notifyPermission, setNotifyPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [showAdd, setShowAdd] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkAnim, setCheckAnim] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] =
    useState<IngredientCategory | null>(null);
  const [quickAdding, setQuickAdding] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "生鲜" as IngredientCategory,
    quantity: "1",
    unit: "克",
    expiryDays: "7",
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
    if (!form.name.trim()) return;
    const expiryDate = addDays(new Date(), Number(form.expiryDays));
    await fetch("/api/ingredients", {
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
    setForm({
      name: "",
      category: "生鲜",
      quantity: "1",
      unit: "克",
      expiryDays: "7",
    });
    setShowAdd(false);
    load();
  };

  const normalizeCategory = (category: string) =>
    category === "干货" ? "零食饮料" : category;

  const handleQuickAdd = async (item: (typeof QUICK_INGREDIENTS)[0]) => {
    if (quickAdding) return;

    setQuickAdding(item.name);
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

      setExpandedCategory(item.category);
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

  const handleToggleRestock = async (item: RestockItem) => {
    setCheckAnim(item.id);
    setTimeout(() => setCheckAnim(null), 500);
    await fetch("/api/restock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, checked: !item.checked }),
    });
    load();
  };

  const handleCopyRestock = () => {
    const unchecked = restock.filter((r) => !r.checked);
    const text = `🛒 小食光补货清单\n${unchecked.map((r, i) => `${i + 1}. ${r.name}`).join("\n")}\n\n一起把冰箱填满吧～`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/ingredients?id=${id}`, { method: "DELETE" });
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

  const toggleCategory = (category: IngredientCategory) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
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
          className="flex-1"
        >
          <ShoppingCart size={16} className="mr-1" /> 补货清单
          {restock.filter((r) => !r.checked).length > 0 && (
            <span className="ml-1 bg-[#E98B75] text-white text-xs px-1.5 py-0.5 rounded-full">
              {restock.filter((r) => !r.checked).length}
            </span>
          )}
        </Button>
      </div>

      <div>
        <p className="text-sm font-medium mb-2 text-[#4A3E3D]/70">快速添加</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_INGREDIENTS.map((item) => (
            <button
              key={item.name}
              type="button"
              disabled={quickAdding === item.name}
              onClick={() => handleQuickAdd(item)}
              className="px-3 py-1.5 bg-white border-2 border-[#E8DFD4] rounded-2xl text-sm hover:border-[#F7D070] hover:bg-[#F7D070]/10 transition-all disabled:opacity-50"
            >
              {quickAdding === item.name ? "添加中..." : `+ ${item.name}`}
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
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${meta.bg}`}
                  >
                    <Icon size={24} className={meta.iconColor} />
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
                  return (
                    <Card
                      key={ing.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ing.name}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getExpiryColor(status)}`}
                          >
                            {getExpiryLabel(status)}
                          </span>
                        </div>
                        <p className="text-sm text-[#4A3E3D]/60 mt-0.5">
                          {ing.quantity}
                          {ing.unit} · 到期 {formatDate(ing.expiryDate)}
                        </p>
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
                          className="p-2 rounded-xl hover:bg-[#E98B75]/20 text-[#E98B75] transition-colors text-sm"
                        >
                          删
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
            <label className="text-sm text-[#4A3E3D]/60">保质期（天）</label>
            <input
              type="number"
              className="w-full mt-1 px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
              value={form.expiryDays}
              onChange={(e) => setForm({ ...form, expiryDays: e.target.value })}
            />
          </div>
          <Button onClick={handleAdd} className="w-full">
            确认添加
          </Button>
        </div>
      </Modal>

      <Modal
        open={showRestock}
        onClose={() => setShowRestock(false)}
        title="补货清单"
      >
        <div className="space-y-2">
          {restock.length === 0 ? (
            <p className="text-center text-[#4A3E3D]/50 py-4">清单是空的，真棒！</p>
          ) : (
            restock.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                  item.checked
                    ? "border-[#E8DFD4] bg-[#E8DFD4]/30 opacity-60"
                    : "border-[#E8DFD4] bg-white hover:border-[#F7D070]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleToggleRestock(item)}
                  className="sr-only"
                />
                <span
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    item.checked
                      ? "border-[#E98B75] bg-[#E98B75] text-white"
                      : "border-[#E8DFD4]"
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
                <span className={item.checked ? "line-through" : ""}>{item.name}</span>
              </label>
            ))
          )}
          {restock.filter((r) => !r.checked).length > 0 && (
            <Button onClick={handleCopyRestock} variant="secondary" className="w-full mt-3">
              {copied ? "已复制到剪贴板 ✓" : "一键生成文本并复制"}
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}
