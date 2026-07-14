import { isSameDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export function normalizeIngredientCategory(category: string): string {
  return category === "干货" ? "零食饮料" : category;
}

export function categoryFilter(category: string) {
  const normalized = normalizeIngredientCategory(category);
  if (normalized === "零食饮料") {
    return { in: ["零食饮料", "干货"] };
  }
  return normalized;
}

export function isSameExpiryDay(
  a: Date | string,
  b: Date | string
): boolean {
  const dateA = a instanceof Date ? a : new Date(a);
  const dateB = b instanceof Date ? b : new Date(b);
  return isSameDay(dateA, dateB);
}

export async function mergeDuplicateIngredients() {
  const ingredients = await prisma.ingredient.findMany({
    where: { quantity: { gt: 0 } },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof ingredients>();

  for (const ing of ingredients) {
    const key = `${ing.name}::${normalizeIngredientCategory(ing.category)}::${ing.expiryDate.toISOString().slice(0, 10)}`;
    const group = groups.get(key) || [];
    group.push(ing);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const [keep, ...duplicates] = group;
    const totalQuantity = group.reduce((sum, ing) => sum + ing.quantity, 0);

    await prisma.ingredient.update({
      where: { id: keep.id },
      data: { quantity: totalQuantity },
    });

    await prisma.ingredient.deleteMany({
      where: { id: { in: duplicates.map((ing) => ing.id) } },
    });
  }
}

export async function upsertIngredient(data: {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: Date;
}) {
  const { name, category, quantity, unit, expiryDate } = data;
  const normalizedCategory = normalizeIngredientCategory(category);

  const candidates = await prisma.ingredient.findMany({
    where: {
      name,
      category: categoryFilter(category),
      quantity: { gt: 0 },
    },
    orderBy: { createdAt: "asc" },
  });

  const matches = candidates.filter((ing) =>
    isSameExpiryDay(ing.expiryDate, expiryDate)
  );

  if (matches.length === 0) {
    return prisma.ingredient.create({
      data: {
        name,
        category: normalizedCategory,
        quantity,
        unit: unit || "个",
        expiryDate,
      },
    });
  }

  const [keep, ...duplicates] = matches;
  const totalQuantity =
    matches.reduce((sum, ing) => sum + ing.quantity, 0) + quantity;

  await prisma.ingredient.update({
    where: { id: keep.id },
    data: {
      quantity: totalQuantity,
      unit: unit || keep.unit,
      category: normalizedCategory,
      expiryDate,
    },
  });

  if (duplicates.length > 0) {
    await prisma.ingredient.deleteMany({
      where: { id: { in: duplicates.map((ing) => ing.id) } },
    });
  }

  return prisma.ingredient.findUniqueOrThrow({ where: { id: keep.id } });
}
