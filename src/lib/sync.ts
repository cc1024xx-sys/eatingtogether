import { prisma } from "@/lib/prisma";

export async function bumpSyncVersion() {
  await prisma.syncState.upsert({
    where: { id: 1 },
    create: { id: 1, version: 1 },
    update: { version: { increment: 1 } },
  });
}

export async function addToRestock(name: string, ingredientId?: string) {
  const existing = await prisma.restockItem.findFirst({
    where: {
      name,
      checked: false,
    },
  });

  if (existing) return existing;

  return prisma.restockItem.create({
    data: {
      name,
      ingredientId: ingredientId ?? null,
    },
  });
}
