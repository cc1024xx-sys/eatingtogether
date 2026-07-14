import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bumpSyncVersion } from "@/lib/sync";

export async function GET() {
  const items = await prisma.restockItem.findMany({
    orderBy: [{ checked: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, ingredientId } = body;

  const existing = await prisma.restockItem.findFirst({
    where: { name, checked: false },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const item = await prisma.restockItem.create({
    data: {
      name,
      ingredientId: ingredientId ?? null,
    },
  });

  await bumpSyncVersion();
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, checked } = body;

  const item = await prisma.restockItem.update({
    where: { id },
    data: { checked },
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

  await prisma.restockItem.delete({ where: { id } });
  await bumpSyncVersion();
  return NextResponse.json({ ok: true });
}
