export type IngredientCategory = "生鲜" | "冷冻" | "调料" | "零食饮料";

export type Difficulty = "新手" | "进阶" | "大厨";

export type RecipeCategory =
  | "快手菜"
  | "家常菜"
  | "招牌菜"
  | "甜品"
  | "酒水饮料";

export type MealType = "早餐" | "午餐" | "晚餐" | "夜宵";

export type ExpiryStatus = "fresh" | "warning" | "urgent" | "expired";

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface RestockItem {
  id: string;
  name: string;
  checked: boolean;
  ingredientId: string | null;
  createdAt: string;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  ingredientId: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  duration: number;
  favorite: number;
  steps: string;
  imageUrl: string | null;
  ingredients: RecipeIngredient[];
  createdAt: string;
  /** 历史被选入今日食谱的总次数 */
  selectionCount?: number;
  /** 各餐次历史被选次数 */
  selectionCountByMealType?: Record<string, number>;
}

export interface MealPlanItem {
  id: string;
  date: string;
  mealType: string;
  recipeId: string;
  completed: boolean;
  recipe: Recipe;
}

export interface Message {
  id: string;
  content: string;
  emoji: string | null;
  authorName: string;
  createdAt: string;
}

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  "生鲜",
  "冷冻",
  "调料",
  "零食饮料",
];

export const CATEGORY_UNIT_OPTIONS: Record<IngredientCategory, string[]> = {
  生鲜: ["个", "克", "把", "块", "毫升"],
  冷冻: ["克", "个", "袋", "包"],
  调料: ["毫升", "克", "勺", "袋"],
  零食饮料: ["个", "毫升", "克", "包", "罐"],
};

export function getDefaultUnit(category: IngredientCategory): string {
  return CATEGORY_UNIT_OPTIONS[category][0];
}

export const DIFFICULTIES: Difficulty[] = ["新手", "进阶", "大厨"];

export const RECIPE_CATEGORIES: RecipeCategory[] = [
  "快手菜",
  "家常菜",
  "招牌菜",
  "甜品",
  "酒水饮料",
];

export const MEAL_TYPES: MealType[] = ["早餐", "午餐", "晚餐", "夜宵"];

export interface QuickIngredient {
  name: string;
  category: IngredientCategory;
  unit: string;
  addAmount: number;
}

export const DEFAULT_QUICK_INGREDIENTS: QuickIngredient[] = [
  { name: "鸡蛋", category: "生鲜", unit: "个", addAmount: 6 },
  { name: "牛奶", category: "零食饮料", unit: "毫升", addAmount: 1000 },
  { name: "番茄", category: "生鲜", unit: "克", addAmount: 300 },
  { name: "牛肉", category: "生鲜", unit: "克", addAmount: 400 },
];

/** @deprecated use DEFAULT_QUICK_INGREDIENTS */
export const QUICK_INGREDIENTS = DEFAULT_QUICK_INGREDIENTS;

export const CUTE_EMOJIS = ["💕", "🥰", "😋", "🍳", "🥘", "❤️", "🌸", "✨", "🫶", "😊"];
