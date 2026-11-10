import { PrismaClient } from "@prisma/client";
import { EXERCISES } from "../src/lib/training/library";
import { FOODS } from "../src/lib/nutrition/foods";

const db = new PrismaClient();

async function main() {
  for (const e of EXERCISES) {
    await db.exercise.upsert({ where: { id: e.id }, create: e, update: e });
  }
  for (const food of FOODS) {
    const f = { id: food.id, nameEn: food.nameEn, nameAr: food.nameAr, category: food.category, kcal: food.kcal, proteinG: food.proteinG, carbsG: food.carbsG, fatG: food.fatG };
    await db.foodItem.upsert({ where: { id: f.id }, create: f, update: f });
  }
  console.log(`Seeded ${EXERCISES.length} exercises and ${FOODS.length} foods`);
}

main().finally(() => db.$disconnect());
