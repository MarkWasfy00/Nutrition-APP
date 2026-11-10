import { describe, expect, it } from "vitest";
import { applyAdjustment, decideAdjustment } from "./adjust";

describe("weekly adjustment", () => {
  it("stalled weight on a cut reduces calories by 150", () => {
    const a = decideAdjustment({ goal: "CUT", previousWeightKg: 80, currentWeightKg: 80, adherence: 8 });
    expect(a.reason).toBe("TOO_SLOW_OR_GAINING");
    expect(a.kcalDelta).toBe(-150);
  });

  it("on-track cut keeps calories", () => {
    const a = decideAdjustment({ goal: "CUT", previousWeightKg: 80, currentWeightKg: 79.4, adherence: 9 });
    expect(a.reason).toBe("ON_TRACK");
    expect(a.kcalDelta).toBe(0);
  });

  it("losing too fast on a cut adds calories", () => {
    const a = decideAdjustment({ goal: "CUT", previousWeightKg: 80, currentWeightKg: 78.6, adherence: 9 });
    expect(a.kcalDelta).toBeGreaterThan(0);
  });

  it("slow bulk adds calories", () => {
    const a = decideAdjustment({ goal: "BULK", previousWeightKg: 70, currentWeightKg: 70, adherence: 8 });
    expect(a.kcalDelta).toBe(150);
  });

  it("low adherence never changes macros", () => {
    const a = decideAdjustment({ goal: "CUT", previousWeightKg: 80, currentWeightKg: 81, adherence: 5 });
    expect(a.reason).toBe("LOW_ADHERENCE");
    expect(a.kcalDelta).toBe(0);
  });

  it("applyAdjustment keeps protein and moves mostly carbs", () => {
    const before = { kcal: 2552, proteinG: 176, carbsG: 300, fatG: 72 }; // 4P + 4C + 9F
    const after = applyAdjustment(before, -150, 80);
    expect(after.proteinG).toBe(176);
    expect(before.carbsG - after.carbsG).toBeGreaterThan(before.fatG - after.fatG);
    expect(after.kcal).toBeGreaterThanOrEqual(2552 - 150 - 10);
    expect(after.kcal).toBeLessThanOrEqual(2552 - 150 + 10);
  });
});
