"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  Cake,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CupSoda,
  Home,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { CookingAnimation } from "@/components/kitchen/CookingAnimation";
import { FavoriteHearts } from "@/components/kitchen/FavoriteHearts";
import { parseJsonResponse } from "@/lib/api";
import { useSync } from "@/lib/hooks";
import {
  DIFFICULTIES,
  MEAL_TYPES,
  RECIPE_CATEGORIES,
  type Ingredient,
  type MealPlanItem,
  type Recipe,
  type RecipeCategory,
} from "@/lib/types";
import { getMealPlanDayLabel, offsetDateString } from "@/lib/utils";

const RECIPE_CATEGORY_META: Record<
  RecipeCategory,
  { icon: LucideIcon; bg: string; iconColor: string }
> = {
  快手菜: { icon: Zap, bg: "bg-[#FFF3E0]", iconColor: "text-[#E6A23C]" },
  家常菜: { icon: Home, bg: "bg-[#E8F5E9]", iconColor: "text-[#5A8F5A]" },
  招牌菜: { icon: Star, bg: "bg-[#FCE4EC]", iconColor: "text-[#C75B7A]" },
  甜品: { icon: Cake, bg: "bg-[#F3E5F5]", iconColor: "text-[#9C6BB8]" },
  酒水饮料: { icon: CupSoda, bg: "bg-[#E3F2FD]", iconColor: "text-[#5B8DB8]" },
};

function normalizeRecipeCategory(category: string): RecipeCategory {
  return RECIPE_CATEGORIES.includes(category as RecipeCategory)
    ? (category as RecipeCategory)
    : "家常菜";
}

const EMPTY_RECIPE_FORM = {
  name: "",
  category: "家常菜" as RecipeCategory,
  difficulty: "新手",
  duration: "30",
  favorite: 3,
  steps: "",
  ingredients: [{ name: "", amount: "1", unit: "个", ingredientId: "" }],
};

export function KitchenModule() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showRecipeDetail, setShowRecipeDetail] = useState<Recipe | null>(null);
  const [showMealPicker, setShowMealPicker] = useState<string | null>(null);
  const [mealPickerSearch, setMealPickerSearch] = useState("");
  const [mealPickerAllExpanded, setMealPickerAllExpanded] = useState(false);
  const [showShortage, setShowShortage] = useState<{
    mealPlanId: string;
    shortages: string[];
  } | null>(null);
  const [cookingAnim, setCookingAnim] = useState(false);
  const [pendingMealId, setPendingMealId] = useState<string | null>(null);
  const [expandedRecipeCategory, setExpandedRecipeCategory] =
    useState<RecipeCategory | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [planDateOffset, setPlanDateOffset] = useState(0);

  const planDate = useMemo(() => offsetDateString(planDateOffset), [planDateOffset]);
  const planDayLabel = getMealPlanDayLabel(planDate);

  const [recipeForm, setRecipeForm] = useState(EMPTY_RECIPE_FORM);

  const load = useCallback(async () => {
    try {
      const [recipesRes, mealRes, ingRes] = await Promise.all([
        fetch("/api/recipes"),
        fetch(`/api/meal-plan?date=${planDate}`),
        fetch("/api/ingredients"),
      ]);
      setRecipes(await parseJsonResponse<Recipe[]>(recipesRes, []));
      setMealPlan(await parseJsonResponse<MealPlanItem[]>(mealRes, []));
      setIngredients(await parseJsonResponse<Ingredient[]>(ingRes, []));
    } catch (error) {
      console.error("加载菜单数据失败", error);
    }
  }, [planDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!showMealPicker) {
      setMealPickerSearch("");
      setMealPickerAllExpanded(false);
    }
  }, [showMealPicker]);

  const openMealPicker = (mealType: string) => {
    setMealPickerSearch("");
    setMealPickerAllExpanded(false);
    setShowMealPicker(mealType);
  };

  useSync(load);

  const handleSaveRecipe = async (e?: FormEvent) => {
    e?.preventDefault();
    if (savingRecipe) return;

    const name = recipeForm.name.trim();
    if (!name) {
      alert("请输入菜品名称");
      return;
    }

    const duration = Number(recipeForm.duration);
    if (!Number.isFinite(duration) || duration < 1) {
      alert("请输入有效的预计时间（至少 1 分钟）");
      return;
    }

    const savedCategory = recipeForm.category;
    const payload = {
      name,
      category: recipeForm.category,
      difficulty: recipeForm.difficulty,
      duration,
      favorite: recipeForm.favorite,
      steps: recipeForm.steps,
      ingredients: recipeForm.ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name.trim(),
          amount: Number(i.amount) || 0,
          unit: i.unit,
          ingredientId: i.ingredientId || null,
        })),
    };

    setSavingRecipe(true);
    try {
      const res = await fetch("/api/recipes", {
        method: editingRecipeId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingRecipeId ? { id: editingRecipeId, ...payload } : payload
        ),
      });

      if (!res.ok) {
        const data = await parseJsonResponse<{ error?: string }>(res, {});
        alert(
          data.error ||
            (editingRecipeId ? "更新失败，请稍后重试" : "保存失败，请稍后重试")
        );
        return;
      }

      setRecipeForm(EMPTY_RECIPE_FORM);
      setEditingRecipeId(null);
      setShowRecipeForm(false);
      setShowRecipeDetail(null);
      setExpandedRecipeCategory(savedCategory);
      await load();
    } catch (error) {
      console.error("保存菜品失败", error);
      alert(editingRecipeId ? "更新失败，请检查网络后重试" : "保存失败，请检查网络后重试");
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleUpdateFavorite = async (recipe: Recipe, favorite: number) => {
    const res = await fetch("/api/recipes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: recipe.id, favorite }),
    });

    if (!res.ok) {
      alert("更新喜爱度失败，请稍后重试");
      return;
    }

    if (showRecipeDetail?.id === recipe.id) {
      const updated = await parseJsonResponse<Recipe | null>(res, null);
      if (updated) setShowRecipeDetail(updated);
    }
    load();
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    const confirmed = window.confirm(`确定删除「${recipe.name}」吗？`);
    if (!confirmed) return;

    const res = await fetch(`/api/recipes?id=${recipe.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("删除失败，请稍后重试");
      return;
    }

    if (showRecipeDetail?.id === recipe.id) {
      setShowRecipeDetail(null);
    }
    if (editingRecipeId === recipe.id) {
      setEditingRecipeId(null);
      setShowRecipeForm(false);
      setRecipeForm(EMPTY_RECIPE_FORM);
    }
    load();
  };

  const handleSetMeal = async (mealType: string, recipeId: string) => {
    const res = await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: planDate,
        mealType,
        recipeId,
      }),
    });
    if (res.ok) {
      setShowMealPicker(null);
      load();
    }
  };

  const handleRemoveMeal = async (mealPlanId: string) => {
    await fetch(`/api/meal-plan?id=${mealPlanId}`, { method: "DELETE" });
    load();
  };

  const handleCompleteMeal = async (mealPlanId: string, addMissing = false) => {
    const res = await fetch("/api/complete-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealPlanId, addMissingToRestock: addMissing }),
    });
    const data = await res.json();

    if (data.hasShortages && !addMissing) {
      setShowShortage({ mealPlanId, shortages: data.shortages });
      return;
    }

    setPendingMealId(mealPlanId);
    setCookingAnim(true);
    setShowShortage(null);
  };

  const onAnimDone = () => {
    setCookingAnim(false);
    setPendingMealId(null);
    load();
  };

  const getMealsForType = (mealType: string) =>
    mealPlan.filter((m) => m.mealType === mealType);

  const isRecipeInMeal = (mealType: string, recipeId: string) =>
    mealPlan.some((m) => m.mealType === mealType && m.recipeId === recipeId);

  const pickerRecipes = useMemo(() => {
    const mealType = showMealPicker;
    const countForMeal = (recipe: Recipe) =>
      mealType ? (recipe.selectionCountByMealType?.[mealType] ?? 0) : 0;

    return [...recipes].sort((a, b) => {
      const countDiff = countForMeal(b) - countForMeal(a);
      if (countDiff !== 0) return countDiff;
      const favDiff = (b.favorite ?? 3) - (a.favorite ?? 3);
      if (favDiff !== 0) return favDiff;
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }, [recipes, showMealPicker]);

  const showPickerTop3 = pickerRecipes.length > 3;

  const topPickerRecipes = useMemo(
    () => (showPickerTop3 ? pickerRecipes.slice(0, 3) : []),
    [pickerRecipes, showPickerTop3]
  );

  const allPickerRecipes = useMemo(
    () => (showPickerTop3 ? pickerRecipes.slice(3) : pickerRecipes),
    [pickerRecipes, showPickerTop3]
  );

  const searchedPickerRecipes = useMemo(() => {
    const query = mealPickerSearch.trim().toLowerCase();
    if (!query) return [];
    return pickerRecipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(query) ||
        normalizeRecipeCategory(recipe.category).toLowerCase().includes(query)
    );
  }, [pickerRecipes, mealPickerSearch]);

  const renderPickerRecipe = (recipe: Recipe, rank?: number) => {
    if (!showMealPicker) return null;

    const alreadyAdded = isRecipeInMeal(showMealPicker, recipe.id);
    const mealTypeCount = recipe.selectionCountByMealType?.[showMealPicker] ?? 0;

    return (
      <button
        key={recipe.id}
        disabled={alreadyAdded}
        onClick={() => handleSetMeal(showMealPicker, recipe.id)}
        className={`w-full text-left p-3 rounded-2xl border-2 transition-colors ${
          alreadyAdded
            ? "border-[#E8DFD4] bg-[#E8DFD4]/30 text-[#4A3E3D]/40 cursor-not-allowed"
            : rank
              ? "border-[#F7D070]/70 bg-[#F7D070]/10 hover:border-[#F7D070]"
              : "border-[#E8DFD4] hover:border-[#F7D070]"
        }`}
      >
        <div className="flex items-start gap-2">
          {rank !== undefined && (
            <span
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                rank === 1
                  ? "bg-[#F7D070] text-[#4A3E3D]"
                  : rank === 2
                    ? "bg-[#E8DFD4] text-[#4A3E3D]"
                    : "bg-[#F5EDE3] text-[#4A3E3D]/70"
              }`}
            >
              {rank}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{recipe.name}</span>
              {alreadyAdded ? (
                <span className="text-xs text-[#4A3E3D]/40 shrink-0">已添加</span>
              ) : mealTypeCount > 0 ? (
                <span className="text-xs text-[#4A3E3D]/40 shrink-0">
                  已选 {mealTypeCount} 次
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F7D070]/30 text-[#4A3E3D]">
                {normalizeRecipeCategory(recipe.category)}
              </span>
              <FavoriteHearts value={recipe.favorite ?? 3} size="sm" />
            </div>
          </div>
        </div>
      </button>
    );
  };

  const difficultyColor = (d: string) => {
    switch (d) {
      case "新手":
        return "bg-green-100 text-green-700";
      case "进阶":
        return "bg-[#F7D070]/40 text-[#4A3E3D]";
      case "大厨":
        return "bg-[#E98B75]/30 text-[#E98B75]";
      default:
        return "bg-[#E8DFD4]";
    }
  };

  const groupedRecipes = RECIPE_CATEGORIES.map((category) => ({
    category,
    items: recipes
      .filter((recipe) => normalizeRecipeCategory(recipe.category) === category)
      .sort((a, b) => (b.favorite ?? 3) - (a.favorite ?? 3)),
  }));

  const openRecipeForm = (category?: RecipeCategory) => {
    setEditingRecipeId(null);
    setRecipeForm({
      ...EMPTY_RECIPE_FORM,
      category: category ?? "家常菜",
    });
    setShowRecipeForm(true);
  };

  const openEditRecipe = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setRecipeForm({
      name: recipe.name,
      category: normalizeRecipeCategory(recipe.category),
      difficulty: recipe.difficulty,
      duration: String(recipe.duration),
      favorite: recipe.favorite ?? 3,
      steps: recipe.steps,
      ingredients:
        recipe.ingredients.length > 0
          ? recipe.ingredients.map((ing) => ({
              name: ing.name,
              amount: String(ing.amount),
              unit: ing.unit,
              ingredientId: ing.ingredientId || "",
            }))
          : [{ name: "", amount: "1", unit: "个", ingredientId: "" }],
    });
    setShowRecipeForm(true);
  };

  const closeRecipeForm = () => {
    if (savingRecipe) return;
    setShowRecipeForm(false);
    setEditingRecipeId(null);
    setRecipeForm(EMPTY_RECIPE_FORM);
  };

  const toggleRecipeCategory = (category: RecipeCategory) => {
    setExpandedRecipeCategory((prev) => (prev === category ? null : category));
  };

  return (
    <div className="space-y-4">
      <CookingAnimation active={cookingAnim} onDone={onAnimDone} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={planDateOffset === 0}
                onClick={() => setPlanDateOffset((offset) => Math.max(0, offset - 1))}
                className="p-1.5 rounded-xl text-[#4A3E3D]/60 hover:bg-[#E8DFD4]/60 hover:text-[#4A3E3D] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label="查看今天"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="font-semibold flex items-center gap-1.5 min-w-[5.5rem] justify-center">
                <UtensilsCrossed size={18} />
                {planDayLabel}
              </h2>
              <button
                type="button"
                disabled={planDateOffset === 1}
                onClick={() => setPlanDateOffset((offset) => Math.min(1, offset + 1))}
                className="p-1.5 rounded-xl text-[#4A3E3D]/60 hover:bg-[#E8DFD4]/60 hover:text-[#4A3E3D] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label="查看明天"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <span className="text-xs text-[#4A3E3D]/50">智能扣减库存</span>
        </div>
        <div className="space-y-2">
          {MEAL_TYPES.map((mealType) => {
            const meals = getMealsForType(mealType);
            return (
              <Card key={mealType}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#4A3E3D]/60">
                    {mealType}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openMealPicker(mealType)}
                  >
                    <Plus size={14} className="mr-0.5" /> 添加
                  </Button>
                </div>
                {meals.length === 0 ? (
                  <p className="text-sm text-[#4A3E3D]/40">还没安排～</p>
                ) : (
                  <div className="space-y-2">
                    {meals.map((meal) => (
                      <div
                        key={meal.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <p
                          className={`font-medium flex-1 min-w-0 truncate ${
                            meal.completed ? "text-[#4A3E3D]/50 line-through" : ""
                          }`}
                        >
                          {meal.recipe.name}
                        </p>
                        <div className="flex gap-1 shrink-0">
                          {!meal.completed && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteMeal(meal.id)}
                            >
                              <Check size={14} className="mr-1" /> 开饭
                            </Button>
                          )}
                          {meal.completed && (
                            <span className="text-sm text-[#F7D070] font-medium px-2 py-1 bg-[#F7D070]/20 rounded-xl">
                              ✓ 已完成
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMeal(meal.id)}
                            aria-label="移除菜品"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-1.5">
            <BookOpen size={18} /> 精选菜品
          </h2>
          <Button
            size="sm"
            onClick={() => openRecipeForm(expandedRecipeCategory ?? undefined)}
          >
            <Plus size={14} className="mr-1" /> 新建
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {groupedRecipes.map(({ category, items }) => {
            const meta = RECIPE_CATEGORY_META[category];
            const Icon = meta.icon;
            const isExpanded = expandedRecipeCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleRecipeCategory(category)}
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
                  {items.length > 0 ? `${items.length} 道菜` : "暂无菜品"}
                </p>
              </button>
            );
          })}
        </div>

        {expandedRecipeCategory && (
          <div className="space-y-2 mt-3">
            {(() => {
              const group = groupedRecipes.find(
                (g) => g.category === expandedRecipeCategory
              );
              if (!group || group.items.length === 0) {
                return (
                  <Card className="text-center py-6 text-[#4A3E3D]/50">
                    <p>{expandedRecipeCategory}还没有菜品</p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => openRecipeForm(expandedRecipeCategory)}
                    >
                      <Plus size={14} className="mr-1" />
                      添加{expandedRecipeCategory}
                    </Button>
                  </Card>
                );
              }

              return group.items.map((recipe) => (
                <Card key={recipe.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setShowRecipeDetail(recipe)}
                      className="text-left w-full"
                    >
                      <p className="font-medium">{recipe.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${difficultyColor(recipe.difficulty)}`}
                        >
                          {recipe.difficulty}
                        </span>
                        <span className="text-xs text-[#4A3E3D]/50 flex items-center gap-0.5">
                          <Clock size={12} /> {recipe.duration}分钟
                        </span>
                      </div>
                    </button>
                    <div className="mt-1.5">
                      <FavoriteHearts
                        value={recipe.favorite ?? 3}
                        onChange={(favorite) =>
                          handleUpdateFavorite(recipe, favorite)
                        }
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditRecipe(recipe)}
                      className="p-2 rounded-xl hover:bg-[#F7D070]/20 transition-colors"
                      title="编辑"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecipe(recipe)}
                      className="p-2 rounded-xl hover:bg-[#E98B75]/20 text-[#E98B75] transition-colors"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              ));
            })()}
          </div>
        )}
      </div>

      <Modal
        open={showMealPicker !== null}
        onClose={() => setShowMealPicker(null)}
        title={`添加${showMealPicker}`}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A3E3D]/40"
            />
            <input
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
              placeholder="搜索菜品名称或类型"
              value={mealPickerSearch}
              onChange={(e) => setMealPickerSearch(e.target.value)}
            />
          </div>

          {pickerRecipes.length === 0 ? (
            <p className="text-center text-[#4A3E3D]/50 py-4">请先创建菜谱</p>
          ) : mealPickerSearch.trim() ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#4A3E3D]/50 px-1">
                搜索结果（{searchedPickerRecipes.length}）
              </p>
              {searchedPickerRecipes.length > 0 ? (
                searchedPickerRecipes.map((recipe) => renderPickerRecipe(recipe))
              ) : (
                <p className="text-center text-[#4A3E3D]/50 py-4">
                  未找到匹配的菜品
                </p>
              )}
            </div>
          ) : (
            <>
              {showPickerTop3 && topPickerRecipes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#4A3E3D]/50 px-1">
                    {showMealPicker}常选 TOP3
                  </p>
                  {topPickerRecipes.map((recipe, index) =>
                    renderPickerRecipe(recipe, index + 1)
                  )}
                </div>
              )}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMealPickerAllExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-2xl border-2 border-[#E8DFD4] bg-white hover:border-[#F7D070]/60 transition-colors"
                >
                  <span className="text-xs font-medium text-[#4A3E3D]/60">
                    全部菜品（{allPickerRecipes.length}）
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-[#4A3E3D]/50 transition-transform ${
                      mealPickerAllExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {mealPickerAllExpanded &&
                  allPickerRecipes.map((recipe) => renderPickerRecipe(recipe))}
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={showShortage !== null}
        onClose={() => setShowShortage(null)}
        title="食材库存不足"
      >
        {showShortage && (
          <div className="space-y-4">
            <p className="text-[#4A3E3D]/80">
              部分食材库存不足，是否将缺少的
              <span className="font-medium text-[#E98B75]">
                {" "}
                {showShortage.shortages.join("、")}{" "}
              </span>
              加入补货清单？
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  handleCompleteMeal(showShortage.mealPlanId, false);
                  setShowShortage(null);
                }}
              >
                仍然开饭
              </Button>
              <Button
                className="flex-1"
                onClick={() =>
                  handleCompleteMeal(showShortage.mealPlanId, true)
                }
              >
                加入补货清单
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showRecipeDetail !== null}
        onClose={() => setShowRecipeDetail(null)}
        title={showRecipeDetail?.name || ""}
      >
        {showRecipeDetail && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F7D070]/30 text-[#4A3E3D]">
                {normalizeRecipeCategory(showRecipeDetail.category)}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${difficultyColor(showRecipeDetail.difficulty)}`}
              >
                {showRecipeDetail.difficulty}
              </span>
              <span className="text-xs text-[#4A3E3D]/50">
                {showRecipeDetail.duration}分钟
              </span>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">喜爱度</p>
              <FavoriteHearts
                value={showRecipeDetail.favorite ?? 3}
                onChange={(favorite) =>
                  handleUpdateFavorite(showRecipeDetail, favorite)
                }
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">所需食材</p>
              <ul className="text-sm space-y-1">
                {showRecipeDetail.ingredients.map((ing) => (
                  <li key={ing.id} className="text-[#4A3E3D]/80">
                    · {ing.name} {ing.amount}
                    {ing.unit}
                  </li>
                ))}
              </ul>
            </div>
            {showRecipeDetail.steps.trim() && (
              <div>
                <p className="text-sm font-medium mb-1">备注</p>
                <p className="text-sm text-[#4A3E3D]/80 whitespace-pre-wrap">
                  {showRecipeDetail.steps}
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  openEditRecipe(showRecipeDetail);
                  setShowRecipeDetail(null);
                }}
              >
                <Pencil size={14} className="mr-1" />
                编辑
              </Button>
              <Button
                variant="secondary"
                className="flex-1 text-[#E98B75] border-[#E98B75]/30 hover:border-[#E98B75]"
                onClick={() => handleDeleteRecipe(showRecipeDetail)}
              >
                <Trash2 size={14} className="mr-1" />
                删除
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showRecipeForm}
        onClose={closeRecipeForm}
        title={editingRecipeId ? "编辑菜品" : "菜品介绍"}
        footer={
          <Button
            type="submit"
            form="recipe-form"
            className="w-full"
            disabled={savingRecipe}
          >
            {savingRecipe
              ? "保存中..."
              : editingRecipeId
                ? "保存修改"
                : "保存菜品"}
          </Button>
        }
      >
        <form
          id="recipe-form"
          className="space-y-3 pb-2"
          onSubmit={handleSaveRecipe}
        >
          <input
            className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
            placeholder="菜品名称"
            value={recipeForm.name}
            onChange={(e) =>
              setRecipeForm({ ...recipeForm, name: e.target.value })
            }
          />
          <select
            className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
            value={recipeForm.category}
            onChange={(e) =>
              setRecipeForm({
                ...recipeForm,
                category: e.target.value as RecipeCategory,
              })
            }
          >
            {RECIPE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <p className="text-sm text-[#4A3E3D]/60 mb-1">难度</p>
              <select
                className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white outline-none"
                value={recipeForm.difficulty}
                onChange={(e) =>
                  setRecipeForm({ ...recipeForm, difficulty: e.target.value })
                }
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-sm text-[#4A3E3D]/60 mb-1">预计时间</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  className="w-20 px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white outline-none"
                  placeholder="30"
                  value={recipeForm.duration}
                  onChange={(e) =>
                    setRecipeForm({ ...recipeForm, duration: e.target.value })
                  }
                />
                <span className="text-sm text-[#4A3E3D]/60 shrink-0">分钟</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">喜爱度</p>
            <FavoriteHearts
              value={recipeForm.favorite}
              onChange={(favorite) =>
                setRecipeForm({ ...recipeForm, favorite })
              }
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">关联食材</p>
            {recipeForm.ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-1 mb-2">
                <select
                  className="flex-1 px-2 py-2 rounded-xl border-2 border-[#E8DFD4] bg-white text-sm outline-none"
                  value={ing.ingredientId}
                  onChange={(e) => {
                    const selected = ingredients.find(
                      (i) => i.id === e.target.value
                    );
                    const updated = [...recipeForm.ingredients];
                    updated[idx] = {
                      ...updated[idx],
                      ingredientId: e.target.value,
                      name: selected?.name || updated[idx].name,
                      unit: selected?.unit || updated[idx].unit,
                    };
                    setRecipeForm({ ...recipeForm, ingredients: updated });
                  }}
                >
                  <option value="">选择冰箱食材</option>
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="w-14 px-2 py-2 rounded-xl border-2 border-[#E8DFD4] text-sm outline-none"
                  value={ing.amount}
                  onChange={(e) => {
                    const updated = [...recipeForm.ingredients];
                    updated[idx].amount = e.target.value;
                    setRecipeForm({ ...recipeForm, ingredients: updated });
                  }}
                />
                <input
                  className="w-12 px-2 py-2 rounded-xl border-2 border-[#E8DFD4] text-sm outline-none"
                  value={ing.unit}
                  onChange={(e) => {
                    const updated = [...recipeForm.ingredients];
                    updated[idx].unit = e.target.value;
                    setRecipeForm({ ...recipeForm, ingredients: updated });
                  }}
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setRecipeForm({
                  ...recipeForm,
                  ingredients: [
                    ...recipeForm.ingredients,
                    { name: "", amount: "1", unit: "个", ingredientId: "" },
                  ],
                })
              }
            >
              + 添加食材
            </Button>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">备注</p>
            <textarea
              className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none min-h-20"
              placeholder="选填，可写做法、口味或小提示"
              value={recipeForm.steps}
              onChange={(e) =>
                setRecipeForm({ ...recipeForm, steps: e.target.value })
              }
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
