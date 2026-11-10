export type Macros = { kcal: number; proteinG: number; carbsG: number; fatG: number };

export type DayType = "TRAINING" | "REST";
export type Slot = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export type MealItem = { foodId: string; food: string; grams: number };

export type PlanMeal = Macros & {
  key: string;
  slot: Slot;
  name: string;
  items: MealItem[];
};

export type PlanDay = {
  day: string; // YYYY-MM-DD
  type: DayType;
  meals: PlanMeal[];
};

export type GroceryItem = { foodId: string; food: string; grams: number };

export const ZERO: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      proteinG: a.proteinG + m.proteinG,
      carbsG: a.carbsG + m.carbsG,
      fatG: a.fatG + m.fatG,
    }),
    ZERO,
  );
}

export function kcalFrom(p: number, c: number, f: number) {
  return Math.round(p * 4 + c * 4 + f * 9);
}
