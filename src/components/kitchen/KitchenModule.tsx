"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Check, Clock, Plus, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { CookingAnimation } from "@/components/kitchen/CookingAnimation";
import { parseJsonResponse } from "@/lib/api";
import { useSync } from "@/lib/hooks";
import {
  DIFFICULTIES,
  MEAL_TYPES,
  type Ingredient,
  type MealPlanItem,
  type Recipe,
} from "@/lib/types";
import { todayString } from "@/lib/utils";

export function KitchenModule() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showRecipeDetail, setShowRecipeDetail] = useState<Recipe | null>(null);
  const [showMealPicker, setShowMealPicker] = useState<string | null>(null);
  const [showShortage, setShowShortage] = useState<{
    mealPlanId: string;
    shortages: string[];
  } | null>(null);
  const [cookingAnim, setCookingAnim] = useState(false);
  const [pendingMealId, setPendingMealId] = useState<string | null>(null);

  const [recipeForm, setRecipeForm] = useState({
    name: "",
    difficulty: "新手",
    duration: "30",
    steps: "",
    ingredients: [{ name: "", amount: "1", unit: "个", ingredientId: "" }],
  });

  const load = useCallback(async () => {
    try {
      const date = todayString();
      const [recipesRes, mealRes, ingRes] = await Promise.all([
        fetch("/api/recipes"),
        fetch(`/api/meal-plan?date=${date}`),
        fetch("/api/ingredients"),
      ]);
      setRecipes(await parseJsonResponse<Recipe[]>(recipesRes, []));
      setMealPlan(await parseJsonResponse<MealPlanItem[]>(mealRes, []));
      setIngredients(await parseJsonResponse<Ingredient[]>(ingRes, []));
    } catch (error) {
      console.error("加载菜单数据失败", error);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSync(load);

  const handleCreateRecipe = async () => {
    if (!recipeForm.name.trim()) return;
    await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: recipeForm.name,
        difficulty: recipeForm.difficulty,
        duration: recipeForm.duration,
        steps: recipeForm.steps,
        ingredients: recipeForm.ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name,
            amount: i.amount,
            unit: i.unit,
            ingredientId: i.ingredientId || null,
          })),
      }),
    });
    setRecipeForm({
      name: "",
      difficulty: "新手",
      duration: "30",
      steps: "",
      ingredients: [{ name: "", amount: "1", unit: "个", ingredientId: "" }],
    });
    setShowRecipeForm(false);
    load();
  };

  const handleSetMeal = async (mealType: string, recipeId: string) => {
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: todayString(),
        mealType,
        recipeId,
      }),
    });
    setShowMealPicker(null);
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

  const getMealForType = (mealType: string) =>
    mealPlan.find((m) => m.mealType === mealType);

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

  return (
    <div className="space-y-4">
      <CookingAnimation active={cookingAnim} onDone={onAnimDone} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-1.5">
            <UtensilsCrossed size={18} /> 今日食谱
          </h2>
          <span className="text-xs text-[#4A3E3D]/50">智能扣减库存</span>
        </div>
        <div className="space-y-2">
          {MEAL_TYPES.map((mealType) => {
            const meal = getMealForType(mealType);
            return (
              <Card key={mealType}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-[#4A3E3D]/60">
                      {mealType}
                    </span>
                    {meal ? (
                      <p className="font-medium mt-0.5">{meal.recipe.name}</p>
                    ) : (
                      <p className="text-sm text-[#4A3E3D]/40 mt-0.5">还没安排～</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {meal && !meal.completed && (
                      <Button
                        size="sm"
                        onClick={() => handleCompleteMeal(meal.id)}
                      >
                        <Check size={14} className="mr-1" /> 确认开饭
                      </Button>
                    )}
                    {meal?.completed && (
                      <span className="text-sm text-[#F7D070] font-medium px-2 py-1 bg-[#F7D070]/20 rounded-xl">
                        ✓ 已完成
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowMealPicker(mealType)}
                    >
                      {meal ? "换" : "选"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-1.5">
            <BookOpen size={18} /> 菜谱库
          </h2>
          <Button size="sm" onClick={() => setShowRecipeForm(true)}>
            <Plus size={14} className="mr-1" /> 新建
          </Button>
        </div>
        {recipes.length === 0 ? (
          <Card className="text-center py-6 text-[#4A3E3D]/50">
            <p>还没有菜谱</p>
            <p className="text-sm mt-1">创建第一个拿手菜吧</p>
          </Card>
        ) : (
          <div className="grid gap-2">
            {recipes.map((recipe) => (
              <Card
                key={recipe.id}
                onClick={() => setShowRecipeDetail(recipe)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
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
                  </div>
                  <span className="text-[#4A3E3D]/30">›</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showMealPicker !== null}
        onClose={() => setShowMealPicker(null)}
        title={`选择${showMealPicker}`}
      >
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() =>
                showMealPicker && handleSetMeal(showMealPicker, recipe.id)
              }
              className="w-full text-left p-3 rounded-2xl border-2 border-[#E8DFD4] hover:border-[#F7D070] transition-colors"
            >
              {recipe.name}
            </button>
          ))}
          {recipes.length === 0 && (
            <p className="text-center text-[#4A3E3D]/50 py-4">请先创建菜谱</p>
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
            <div className="flex gap-2">
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
            <div>
              <p className="text-sm font-medium mb-1">步骤</p>
              <p className="text-sm text-[#4A3E3D]/80 whitespace-pre-wrap">
                {showRecipeDetail.steps}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={showRecipeForm}
        onClose={() => setShowRecipeForm(false)}
        title="创建菜谱"
      >
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          <input
            className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
            placeholder="菜品名称"
            value={recipeForm.name}
            onChange={(e) =>
              setRecipeForm({ ...recipeForm, name: e.target.value })
            }
          />
          <div className="flex gap-2">
            <select
              className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white outline-none"
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
            <input
              type="number"
              className="w-24 px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white outline-none"
              placeholder="分钟"
              value={recipeForm.duration}
              onChange={(e) =>
                setRecipeForm({ ...recipeForm, duration: e.target.value })
              }
            />
          </div>
          <textarea
            className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none min-h-24"
            placeholder="步骤（支持换行）"
            value={recipeForm.steps}
            onChange={(e) =>
              setRecipeForm({ ...recipeForm, steps: e.target.value })
            }
          />
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
          <Button onClick={handleCreateRecipe} className="w-full">
            保存菜谱
          </Button>
        </div>
      </Modal>
    </div>
  );
}
