import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { addDays } from "date-fns";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.syncState.upsert({
    where: { id: 1 },
    create: { id: 1, version: 0 },
    update: {},
  });

  const ingredients = await Promise.all([
    prisma.ingredient.create({
      data: {
        name: "番茄",
        category: "生鲜",
        quantity: 5,
        unit: "个",
        expiryDate: addDays(new Date(), 2),
      },
    }),
    prisma.ingredient.create({
      data: {
        name: "鸡蛋",
        category: "生鲜",
        quantity: 8,
        unit: "个",
        expiryDate: addDays(new Date(), 10),
      },
    }),
    prisma.ingredient.create({
      data: {
        name: "鸡胸肉",
        category: "生鲜",
        quantity: 300,
        unit: "克",
        expiryDate: addDays(new Date(), 5),
      },
    }),
    prisma.ingredient.create({
      data: {
        name: "大米",
        category: "零食饮料",
        quantity: 1000,
        unit: "克",
        expiryDate: addDays(new Date(), 90),
      },
    }),
    prisma.ingredient.create({
      data: {
        name: "酱油",
        category: "调料",
        quantity: 200,
        unit: "毫升",
        expiryDate: addDays(new Date(), 180),
      },
    }),
  ]);

  const tomato = ingredients[0];
  const egg = ingredients[1];
  const chicken = ingredients[2];

  const recipe1 = await prisma.recipe.create({
    data: {
      name: "番茄炒蛋",
      difficulty: "新手",
      duration: 15,
      steps:
        "1. 番茄切块，鸡蛋打散\n2. 热油炒鸡蛋至金黄盛出\n3. 炒番茄至软烂\n4. 倒入鸡蛋翻炒均匀，加盐调味",
      ingredients: {
        create: [
          { name: "番茄", amount: 2, unit: "个", ingredientId: tomato.id },
          { name: "鸡蛋", amount: 3, unit: "个", ingredientId: egg.id },
        ],
      },
    },
  });

  const recipe2 = await prisma.recipe.create({
    data: {
      name: "可乐鸡翅",
      difficulty: "进阶",
      duration: 40,
      steps:
        "1. 鸡翅洗净划刀\n2. 焯水去血沫\n3. 煎至两面金黄\n4. 加可乐、酱油焖煮20分钟\n5. 大火收汁",
      ingredients: {
        create: [
          {
            name: "鸡胸肉",
            amount: 200,
            unit: "克",
            ingredientId: chicken.id,
          },
          {
            name: "酱油",
            amount: 30,
            unit: "毫升",
            ingredientId: ingredients[4].id,
          },
        ],
      },
    },
  });

  const today = new Date().toISOString().split("T")[0];

  await prisma.mealPlanItem.create({
    data: {
      date: today,
      mealType: "晚餐",
      recipeId: recipe1.id,
    },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
