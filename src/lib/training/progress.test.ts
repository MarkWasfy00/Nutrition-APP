import { describe, expect, it } from "vitest";
import { epley1RM, isPR, suggestNext, trainingAdherence } from "./progress";

describe("progress", () => {
  it("Epley 1RM", () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 5)).toBeCloseTo(116.7, 1);
    expect(epley1RM(0, 5)).toBe(0);
  });

  it("detects PRs by estimated 1RM", () => {
    const history = [{ weightKg: 100, reps: 5 }, { weightKg: 105, reps: 3 }];
    expect(isPR({ weightKg: 100, reps: 6 }, history)).toBe(true);
    expect(isPR({ weightKg: 100, reps: 4 }, history)).toBe(false);
    expect(isPR({ weightKg: 20, reps: 10 }, [])).toBe(true);
  });

  it("double progression adds 2.5 kg upper / 5 kg lower when all sets hit the top", () => {
    const sets = [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 10 }, { weightKg: 60, reps: 10 }];
    expect(suggestNext({ lastSets: sets, plannedSets: 3, repMin: 6, repMax: 10, isLowerBody: false }))
      .toEqual({ weightKg: 62.5, reps: 6, increased: true });
    expect(suggestNext({ lastSets: sets, plannedSets: 3, repMin: 6, repMax: 10, isLowerBody: true })!.weightKg).toBe(65);
  });

  it("keeps the weight and adds a rep otherwise", () => {
    const sets = [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 8 }, { weightKg: 60, reps: 7 }];
    expect(suggestNext({ lastSets: sets, plannedSets: 3, repMin: 6, repMax: 10, isLowerBody: false }))
      .toEqual({ weightKg: 60, reps: 8, increased: false });
  });

  it("training adherence", () => {
    expect(trainingAdherence(3, 4)).toBe(0.75);
    expect(trainingAdherence(5, 4)).toBe(1);
  });
});
