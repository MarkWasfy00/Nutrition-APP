"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionPaidUser } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { getDailyStatus } from "@/lib/nutrition/daily";

const SLOTS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

/** Toggle a planned meal for today as eaten / not eaten. */
export async function togglePlanMeal(mealKey: string) {
  const user = await actionPaidUser();
  const day = today();
  const existing = await db.foodLog.findFirst({ where: { userId: user.id, day, planMealKey: mealKey } });
  if (existing) {
    await db.foodLog.delete({ where: { id: existing.id } });
  } else {
    const status = await getDailyStatus(user.id, day);
    const meal = status && !status.expired ? status.planDay?.meals.find((m) => m.key === mealKey) : null;
    if (!meal) return;
    await db.foodLog.create({
      data: {
        userId: user.id, day, slot: meal.slot, name: meal.name, planMealKey: meal.key,
        kcal: meal.kcal, proteinG: meal.proteinG, carbsG: meal.carbsG, fatG: meal.fatG,
      },
    });
  }
  revalidatePath("/", "layout");
}

export async function searchFoods(q: string) {
  const user = await actionPaidUser();
  const query = q.trim();
  return db.foodItem.findMany({
    where: {
      AND: [
        { OR: [{ userId: null }, { userId: user.id }] },
        query ? { OR: [{ nameEn: { contains: query, mode: "insensitive" } }, { nameAr: { contains: query } }] } : {},
      ],
    },
    take: 12,
    orderBy: { nameEn: "asc" },
  });
}

const addSchema = z.object({ foodId: z.string(), grams: z.coerce.number().min(1).max(3000), slot: z.enum(SLOTS) });

export async function addFoodLog(input: { foodId: string; grams: number; slot: string; locale: string }) {
  const user = await actionPaidUser();
  const { foodId, grams, slot } = addSchema.parse(input);
  const food = await db.foodItem.findFirst({ where: { id: foodId, OR: [{ userId: null }, { userId: user.id }] } });
  if (!food) throw new Error("NOT_FOUND");
  const k = grams / 100;
  await db.foodLog.create({
    data: {
      userId: user.id, day: today(), slot, foodItemId: food.id, grams,
      name: input.locale.startsWith("ar") ? food.nameAr : food.nameEn,
      kcal: food.kcal * k, proteinG: food.proteinG * k, carbsG: food.carbsG * k, fatG: food.fatG * k,
    },
  });
  revalidatePath("/", "layout");
}

export async function deleteFoodLog(id: string) {
  const user = await actionPaidUser();
  await db.foodLog.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/", "layout");
}

const customSchema = z.object({
  name: z.string().trim().min(2).max(60),
  kcal: z.coerce.number().min(0).max(900),
  proteinG: z.coerce.number().min(0).max(100),
  carbsG: z.coerce.number().min(0).max(100),
  fatG: z.coerce.number().min(0).max(100),
});

export async function addCustomFood(input: z.input<typeof customSchema>) {
  const user = await actionPaidUser();
  const d = customSchema.parse(input);
  return db.foodItem.create({
    data: { nameEn: d.name, nameAr: d.name, category: "custom", kcal: d.kcal, proteinG: d.proteinG, carbsG: d.carbsG, fatG: d.fatG, userId: user.id },
  });
}
