import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bumpSyncVersion } from "@/lib/sync";

function clampFavorite(value: unknown): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
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
  const body = await request.json();
  const { name, category, difficulty, duration, favorite, steps, imageUrl, ingredients } =
    body;

  const recipe = await prisma.recipe.create({
    data: {
      name,
      category: category || "家常菜",
      difficulty,
      duration: Number(duration),
      favorite: clampFavorite(favorite ?? 3),
      steps: steps?.trim() || "",
      imageUrl: imageUrl ?? null,
      ingredients: {
        create: (ingredients || []).map(
          (ing: { name: string; amount: number; unit?: string; ingredientId?: string }) => ({
            name: ing.name,
            amount: Number(ing.amount),
            unit: ing.unit || "个",
            ingredientId: ing.ingredientId ?? null,
          })
        ),
      },
    },
    include: { ingredients: true },
  });

  await bumpSyncVersion();
  return NextResponse.json(recipe, { status: 201 });
}

export async function PATCH(request: NextRequest) {
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

  await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });

  const recipe = await prisma.recipe.update({
    where: { id },
    data: {
      name,
      category: category || "家常菜",
      difficulty,
      duration: Number(duration),
      favorite: clampFavorite(favorite ?? 3),
      steps: steps?.trim() || "",
      imageUrl: imageUrl ?? null,
      ingredients: {
        create: (ingredients || []).map(
          (ing: { name: string; amount: number; unit?: string; ingredientId?: string }) => ({
            name: ing.name,
            amount: Number(ing.amount),
            unit: ing.unit || "个",
            ingredientId: ing.ingredientId ?? null,
          })
        ),
      },
    },
    include: { ingredients: true },
  });

  await bumpSyncVersion();
  return NextResponse.json(recipe);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }

  await prisma.recipe.delete({ where: { id } });
  await bumpSyncVersion();
  return NextResponse.json({ ok: true });
}
