import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bumpSyncVersion } from "@/lib/sync";

export async function GET() {
  const state = await prisma.syncState.findUnique({ where: { id: 1 } });
  return NextResponse.json({ version: state?.version ?? 0 });
}

export async function POST() {
  await bumpSyncVersion();
  const state = await prisma.syncState.findUnique({ where: { id: 1 } });
  return NextResponse.json({ version: state?.version ?? 0 });
}
