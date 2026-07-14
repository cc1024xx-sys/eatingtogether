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
    orderBy: { mealType: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, mealType, recipeId } = body;

  const item = await prisma.mealPlanItem.upsert({
    where: {
      date_mealType: { date, mealType },
    },
    create: { date, mealType, recipeId },
    update: { recipeId, completed: false },
    include: {
      recipe: { include: { ingredients: true } },
    },
  });

  await bumpSyncVersion();
  return NextResponse.json(item);
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
