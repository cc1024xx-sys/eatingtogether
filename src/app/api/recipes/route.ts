import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bumpSyncVersion } from "@/lib/sync";

export async function GET() {
  const recipes = await prisma.recipe.findMany({
    include: { ingredients: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(recipes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, difficulty, duration, steps, imageUrl, ingredients } = body;

  const recipe = await prisma.recipe.create({
    data: {
      name,
      difficulty,
      duration: Number(duration),
      steps,
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
