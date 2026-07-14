import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bumpSyncVersion } from "@/lib/sync";

export async function GET() {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content, emoji, authorName } = body;

  const message = await prisma.message.create({
    data: {
      content,
      emoji: emoji ?? null,
      authorName: authorName || "我",
    },
  });

  await bumpSyncVersion();
  return NextResponse.json(message, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }

  await prisma.message.delete({ where: { id } });
  await bumpSyncVersion();
  return NextResponse.json({ ok: true });
}
