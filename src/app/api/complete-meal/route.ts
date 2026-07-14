import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addToRestock, bumpSyncVersion } from "@/lib/sync";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { mealPlanId, addMissingToRestock } = body;

  const mealPlan = await prisma.mealPlanItem.findUnique({
    where: { id: mealPlanId },
    include: {
      recipe: { include: { ingredients: true } },
    },
  });

  if (!mealPlan) {
    return NextResponse.json({ error: "餐单不存在" }, { status: 404 });
  }

  const shortages: string[] = [];

  for (const ri of mealPlan.recipe.ingredients) {
    if (!ri.ingredientId) continue;

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ri.ingredientId },
    });

    if (!ingredient) continue;

    const newQty = ingredient.quantity - ri.amount;

    if (newQty < 0) {
      shortages.push(ri.name);
      if (addMissingToRestock) {
        await addToRestock(ri.name, ri.ingredientId);
      }
      continue;
    }

    await prisma.ingredient.update({
      where: { id: ri.ingredientId },
      data: { quantity: newQty },
    });

    if (newQty <= 0) {
      await addToRestock(ingredient.name, ingredient.id);
    }
  }

  await prisma.mealPlanItem.update({
    where: { id: mealPlanId },
    data: { completed: true },
  });

  await bumpSyncVersion();

  return NextResponse.json({
    ok: true,
    shortages,
    hasShortages: shortages.length > 0,
  });
}
