import { NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api";
import {
  mergeDuplicateIngredients,
  upsertIngredient,
} from "@/lib/ingredients";
import { prisma } from "@/lib/prisma";
import { addToRestock, bumpSyncVersion } from "@/lib/sync";

export async function GET() {
  return withApiHandler(async () => {
    await mergeDuplicateIngredients();
    const ingredients = await prisma.ingredient.findMany({
      orderBy: { expiryDate: "asc" },
    });
    return NextResponse.json(ingredients);
  });
}

export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const body = await request.json();
    const { name, category, quantity, unit, expiryDate } = body;

    const ingredient = await upsertIngredient({
      name,
      category,
      quantity: Number(quantity),
      unit: unit || "个",
      expiryDate: new Date(expiryDate),
    });

    await bumpSyncVersion();
    return NextResponse.json(ingredient, { status: 201 });
  });
}

export async function PATCH(request: NextRequest) {
  return withApiHandler(async () => {
    const body = await request.json();
    const { id, quantity, expiryDate, name, category, unit } = body;

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(unit !== undefined && { unit }),
        ...(expiryDate !== undefined && { expiryDate: new Date(expiryDate) }),
      },
    });

    if (ingredient.quantity <= 0) {
      await addToRestock(ingredient.name, ingredient.id);
    } else {
      await mergeDuplicateIngredients();
    }

    await bumpSyncVersion();
    const merged = await prisma.ingredient.findUnique({ where: { id } });
    return NextResponse.json(merged ?? ingredient);
  });
}

export async function DELETE(request: NextRequest) {
  return withApiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const category = searchParams.get("category");

    if (category) {
      const categories =
        category === "零食饮料" ? ["零食饮料", "干货"] : [category];

      const result = await prisma.ingredient.deleteMany({
        where: {
          category: { in: categories },
          quantity: { gt: 0 },
        },
      });

      await bumpSyncVersion();
      return NextResponse.json({ ok: true, count: result.count });
    }

    if (!id) {
      return NextResponse.json({ error: "缺少 id 或 category" }, { status: 400 });
    }

    await prisma.ingredient.delete({ where: { id } });
    await bumpSyncVersion();
    return NextResponse.json({ ok: true });
  });
}
