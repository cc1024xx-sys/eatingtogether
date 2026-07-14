import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";

export async function GET() {
  const ingredients = await prisma.ingredient.findMany({
    where: { quantity: { gt: 0 } },
    orderBy: { expiryDate: "asc" },
  });

  const expiring = ingredients
    .map((ing) => {
      const daysLeft = differenceInDays(ing.expiryDate, new Date());
      return {
        id: ing.id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        expiryDate: ing.expiryDate,
        daysLeft,
        status: daysLeft < 0 ? ("expired" as const) : ("urgent" as const),
      };
    })
    .filter((ing) => ing.daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return NextResponse.json({
    expiring,
    total: expiring.length,
  });
}
