import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bumpSyncVersion } from "@/lib/sync";

function clampFavorite(value: unknown): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function parseDuration(value: unknown): number | null {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 1) return null;
  return Math.round(duration);
}

function parseIngredients(
  ingredients: unknown
): Array<{ name: string; amount: number; unit: string; ingredientId: string | null }> {
  if (!Array.isArray(ingredients)) return [];

  return ingredients
    .filter(
      (ing): ing is { name: string; amount: unknown; unit?: string; ingredientId?: string | null } =>
        typeof ing === "object" &&
        ing !== null &&
        typeof (ing as { name?: unknown }).name === "string" &&
        (ing as { name: string }).name.trim().length > 0
    )
    .map((ing) => ({
      name: ing.name.trim(),
      amount: Number(ing.amount) || 0,
      unit: ing.unit?.trim() || "个",
      ingredientId: ing.ingredientId?.trim() ? ing.ingredientId.trim() : null,
    }));
}

export async function GET() {
  const [rows, mealPlanCounts] = await Promise.all([
    prisma.recipe.findMany({
      include: {
        ingredients: true,
        _count: { select: { mealPlans: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mealPlanItem.groupBy({
      by: ["recipeId", "mealType"],
      _count: { _all: true },
    }),
  ]);

  const countsByRecipe = new Map<string, Record<string, number>>();
  for (const row of mealPlanCounts) {
    const existing = countsByRecipe.get(row.recipeId) ?? {};
    existing[row.mealType] = row._count._all;
    countsByRecipe.set(row.recipeId, existing);
  }

  const recipes = rows.map(({ _count, ...recipe }) => ({
    ...recipe,
    selectionCount: _count.mealPlans,
    selectionCountByMealType: countsByRecipe.get(recipe.id) ?? {},
  }));
  return NextResponse.json(recipes);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, difficulty, duration, favorite, steps, imageUrl, ingredients } =
      body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json({ error: "请输入菜品名称" }, { status: 400 });
    }

    const parsedDuration = parseDuration(duration);
    if (parsedDuration === null) {
      return NextResponse.json({ error: "预计时间无效" }, { status: 400 });
    }

    const recipe = await prisma.recipe.create({
      data: {
        name: trimmedName,
        category: category || "家常菜",
        difficulty: difficulty || "新手",
        duration: parsedDuration,
        favorite: clampFavorite(favorite ?? 3),
        steps: typeof steps === "string" ? steps.trim() : "",
        imageUrl: imageUrl ?? null,
        ingredients: {
          create: parseIngredients(ingredients),
        },
      },
      include: { ingredients: true },
    });

    await bumpSyncVersion();
    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("创建菜品失败", error);
    return NextResponse.json({ error: "保存菜品失败，请稍后重试" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      category,
      difficulty,
      duration,
      favorite,
      steps,
      imageUrl,
      ingredients,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const isFavoriteOnly =
      favorite !== undefined &&
      name === undefined &&
      category === undefined &&
      difficulty === undefined &&
      duration === undefined &&
      steps === undefined &&
      imageUrl === undefined &&
      ingredients === undefined;

    if (isFavoriteOnly) {
      const recipe = await prisma.recipe.update({
        where: { id },
        data: { favorite: clampFavorite(favorite) },
        include: { ingredients: true },
      });
      await bumpSyncVersion();
      return NextResponse.json(recipe);
    }

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json({ error: "请输入菜品名称" }, { status: 400 });
    }

    const parsedDuration = parseDuration(duration);
    if (parsedDuration === null) {
      return NextResponse.json({ error: "预计时间无效" }, { status: 400 });
    }

    await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        name: trimmedName,
        category: category || "家常菜",
        difficulty: difficulty || "新手",
        duration: parsedDuration,
        favorite: clampFavorite(favorite ?? 3),
        steps: typeof steps === "string" ? steps.trim() : "",
        imageUrl: imageUrl ?? null,
        ingredients: {
          create: parseIngredients(ingredients),
        },
      },
      include: { ingredients: true },
    });

    await bumpSyncVersion();
    return NextResponse.json(recipe);
  } catch (error) {
    console.error("更新菜品失败", error);
    return NextResponse.json({ error: "更新菜品失败，请稍后重试" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    await prisma.recipe.delete({ where: { id } });
    await bumpSyncVersion();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("删除菜品失败", error);
    return NextResponse.json({ error: "删除菜品失败，请稍后重试" }, { status: 500 });
  }
}
