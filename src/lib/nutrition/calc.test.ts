import { describe, expect, it } from "vitest";
import { bmr, calculateTargets, splitMacros } from "./calc";

const athlete = {
  weightKg: 80, heightCm: 180, ageYears: 25, sex: "MALE" as const, fatFreeMassKg: 68, bodyFatPct: 15,
  goal: "CUT" as const, trainingDaysPerWeek: 5, intensity: "HIGH" as const,
};

describe("calc", () => {
  it("uses Katch-McArdle with InBody FFM", () => {
    expect(bmr(athlete)).toBeCloseTo(370 + 21.6 * 68, 5);
  });

  it("falls back to Mifflin-St Jeor without FFM", () => {
    expect(bmr({ ...athlete, fatFreeMassKg: null })).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 25 + 5, 5);
  });

  it("80 kg / 68 kg FFM athlete cutting: -15% with expected macros", () => {
    const r = calculateTargets(athlete);
    expect(r.bmr).toBe(1839);
    expect(r.goalAdjustPct).toBe(-15);
    // weekly average = (3310*5 + 2390*2)/7 = 3047 -> *0.85 = 2590
    const weekly = (r.training.kcal * 5 + r.rest.kcal * 2) / 7;
    expect(weekly).toBeGreaterThan(2560);
    expect(weekly).toBeLessThan(2620);
    expect(r.training.kcal).toBeGreaterThan(r.rest.kcal);
    expect(r.training.proteinG).toBe(176); // 2.2 g/kg
    expect(r.rest.fatG).toBeGreaterThanOrEqual(64); // >= 0.8 g/kg
    expect(r.training.carbsG).toBeGreaterThan(r.rest.carbsG);
  });

  it("uses a bigger deficit at higher body fat", () => {
    expect(calculateTargets({ ...athlete, bodyFatPct: 24 }).goalAdjustPct).toBe(-20);
  });

  it("bulk adds 10% and performance adds 5% on training days only", () => {
    const m = calculateTargets({ ...athlete, goal: "MAINTAIN" });
    const b = calculateTargets({ ...athlete, goal: "BULK" });
    const p = calculateTargets({ ...athlete, goal: "PERFORMANCE" });
    expect(b.training.kcal / m.training.kcal).toBeCloseTo(1.1, 1);
    expect(p.training.kcal).toBeGreaterThan(m.training.kcal);
    expect(Math.abs(p.rest.kcal - m.rest.kcal)).toBeLessThan(30);
  });

  it("kcal always equals 4P + 4C + 9F", () => {
    const m = splitMacros(2500, 80, "CUT", "TRAINING");
    expect(m.kcal).toBe(m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9);
  });
});
