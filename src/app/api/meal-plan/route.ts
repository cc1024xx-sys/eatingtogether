import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bumpSyncVersion } from "@/lib/sync";
import { todayString } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayString();

  const items = await prisma.mealPlanItem.findMany({
    where: { date },
    include: {
      recipe: { include: { ingredients: true } },
    },
    orderBy: [{ mealType: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, mealType, recipeId } = body;

  const existing = await prisma.mealPlanItem.findFirst({
    where: { date, mealType, recipeId },
  });
  if (existing) {
    return NextResponse.json({ error: "该菜品已在餐单中" }, { status: 409 });
  }

  const item = await prisma.mealPlanItem.create({
    data: { date, mealType, recipeId },
    include: {
      recipe: { include: { ingredients: true } },
    },
  });

  await bumpSyncVersion();
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }

  await prisma.mealPlanItem.delete({ where: { id } });
  await bumpSyncVersion();
  return NextResponse.json({ ok: true });
}
