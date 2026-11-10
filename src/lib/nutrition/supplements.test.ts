import { describe, expect, it } from "vitest";
import { buildWeekMeals, dayTotals } from "./meals";
import { allowedSupplements, sanitizeSupplements, supplementSchedule } from "./supplements";

const targets = {
  TRAINING: { kcal: 3300, proteinG: 150, carbsG: 450, fatG: 90 },
  REST: { kcal: 2700, proteinG: 150, carbsG: 330, fatG: 85 },
};
const days = Array.from({ length: 7 }, (_, i) => ({ day: `2026-11-0${i + 1}`, type: (i % 2 ? "REST" : "TRAINING") as "REST" | "TRAINING" }));
const week = (supplements: string[], extra: Partial<Parameters<typeof buildWeekMeals>[0]> = {}) =>
  buildWeekMeals({ days, targets, mealsPerDay: 5, allergies: [], dietaryPrefs: [], supplements, locale: "en", weekNumber: 1, ...extra });
const foodIds = (w: ReturnType<typeof week>) => w.flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => i.foodId)));

describe("supplements in meal plans", () => {
  it("a plan without supplements never contains supplement products", () => {
    const ids = foodIds(week([]));
    for (const s of ["whey", "casein", "mass-gainer"]) expect(ids).not.toContain(s);
  });

  it("only the supplements the athlete allowed appear", () => {
    const ids = foodIds(week(["WHEY"]));
    expect(ids).toContain("whey");
    expect(ids).not.toContain("mass-gainer");
    expect(ids).not.toContain("casein");
  });

  it("post-workout snack on training days is a shake; casein is the evening snack", () => {
    const w = week(["WHEY", "MASS_GAINER", "CASEIN"]);
    for (const d of w) {
      const snacks = d.meals.filter((m) => m.slot === "SNACK");
      const first = snacks[0].items.map((i) => i.foodId);
      const last = snacks.at(-1)!.items.map((i) => i.foodId);
      if (d.type === "TRAINING") expect(first.some((id) => id === "whey" || id === "mass-gainer")).toBe(true);
      expect(last).toContain("casein");
    }
    expect(foodIds(w)).toEqual(expect.arrayContaining(["whey", "mass-gainer", "casein"]));
    // Whey alone is the post-workout shake.
    const wheyOnly = week(["WHEY"]).filter((d) => d.type === "TRAINING");
    wheyOnly.forEach((d) => expect(d.meals.filter((m) => m.slot === "SNACK")[0].items.map((i) => i.foodId)).toContain("whey"));
  });

  it("still hits calorie targets with shakes", () => {
    for (const d of week(["WHEY", "MASS_GAINER"])) {
      expect(Math.abs(dayTotals(d).kcal - targets[d.type].kcal) / targets[d.type].kcal).toBeLessThan(0.07);
    }
  });

  it("dairy allergy overrides dairy-based supplements", () => {
    const ids = foodIds(week(["WHEY", "MASS_GAINER"], { allergies: ["DAIRY"] }));
    expect(ids).not.toContain("whey");
    expect(ids).not.toContain("mass-gainer");
  });
});

describe("supplement schedule", () => {
  it("opt-out means no supplements, unknown ids are dropped", () => {
    expect(allowedSupplements({ useSupplements: false, supplements: ["CREATINE"] })).toEqual([]);
    expect(sanitizeSupplements(["CREATINE", "STEROIDS", "CREATINE"])).toEqual(["CREATINE"]);
  });

  it("training-only items are skipped on rest days and caffeine is dosed by weight (capped)", () => {
    const rest = supplementSchedule(["CREATINE", "CAFFEINE", "ELECTROLYTES"], 80, "REST", "en").map((s) => s.id);
    expect(rest).toEqual(["CREATINE"]);
    const train = supplementSchedule(["CAFFEINE"], 80, "TRAINING", "en")[0];
    expect(train.dose).toContain("250 mg");
    expect(supplementSchedule(["CAFFEINE"], 150, "TRAINING", "en")[0].dose).toContain("400 mg");
    expect(supplementSchedule(["WHEY"], 80, "TRAINING", "ar-EG")[0]).toMatchObject({ name: "واي بروتين", inMeals: true });
  });
});
