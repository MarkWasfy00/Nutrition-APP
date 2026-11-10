import { describe, expect, it } from "vitest";
import { buildWeekMeals, dayTotals, groceryList, scaleDay } from "./meals";
import { computeDailyStatus } from "./remaining";

const targets = {
  TRAINING: { kcal: 2800, proteinG: 176, carbsG: 340, fatG: 78 },
  REST: { kcal: 2100, proteinG: 176, carbsG: 186, fatG: 70 },
};
const days = Array.from({ length: 7 }, (_, i) => ({ day: `2026-11-0${i + 1}`, type: (i % 3 === 2 ? "REST" : "TRAINING") as "REST" | "TRAINING" }));

describe("meal builder", () => {
  it("each day lands within ~7% of kcal and ~10% of protein", () => {
    const week = buildWeekMeals({ days, targets, mealsPerDay: 4, allergies: [], dietaryPrefs: [], locale: "en", weekNumber: 1, supplements: [] });
    for (const d of week) {
      const t = targets[d.type];
      const a = dayTotals(d);
      expect(Math.abs(a.kcal - t.kcal) / t.kcal).toBeLessThan(0.07);
      expect(Math.abs(a.proteinG - t.proteinG) / t.proteinG).toBeLessThan(0.1);
      expect(d.meals).toHaveLength(4);
    }
  });

  it("respects allergies", () => {
    const week = buildWeekMeals({ days, targets, mealsPerDay: 5, allergies: ["DAIRY", "EGGS", "NUTS"], dietaryPrefs: ["VEGETARIAN"], locale: "ar-EG", weekNumber: 2, supplements: [] });
    const ids = week.flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => i.foodId)));
    for (const bad of ["whey", "eggs", "egg-whites", "almonds", "chicken-breast", "tuna", "greek-yogurt"]) expect(ids).not.toContain(bad);
  });

  it("scaleDay hits the kcal target and grocery list sums grams", () => {
    const [d] = buildWeekMeals({ days: days.slice(0, 1), targets, mealsPerDay: 3, allergies: [], dietaryPrefs: [], locale: "en", weekNumber: 1, supplements: [] });
    const s = scaleDay(d, { ...targets.TRAINING, kcal: 2500 });
    expect(Math.abs(dayTotals(s).kcal - 2500)).toBeLessThan(80);
    const g = groceryList([d]);
    expect(g.reduce((a, x) => a + x.grams, 0)).toBe(d.meals.flatMap((m) => m.items).reduce((a, i) => a + i.grams, 0));
  });
});

describe("daily remaining", () => {
  it("remaining = target - eaten", () => {
    const s = computeDailyStatus(targets.TRAINING, [
      { kcal: 600, proteinG: 40, carbsG: 70, fatG: 15 },
      { kcal: 800, proteinG: 50, carbsG: 90, fatG: 25 },
    ]);
    expect(s.remaining).toEqual({ kcal: 1400, proteinG: 86, carbsG: 180, fatG: 38 });
  });

  it("optionally adds back workout burn as carbs", () => {
    const s = computeDailyStatus(targets.REST, [], 300, true);
    expect(s.remaining.kcal).toBe(2400);
    expect(s.remaining.carbsG).toBe(186 + 75);
    expect(computeDailyStatus(targets.REST, [], 300, false).remaining.kcal).toBe(2100);
  });
});
