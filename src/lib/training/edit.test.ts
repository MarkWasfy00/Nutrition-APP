import { describe, expect, it } from "vitest";
import { asDeload, defaultsFor, editedExerciseSchema, firstInvalidRow } from "./edit";

const row = { exerciseId: "back-squat", sets: 4, repMin: 4, repMax: 6, distanceM: null, targetRpe: 8, restSec: 180 };
const measure = (id: string) => ({ "back-squat": "LOAD_REPS", "copenhagen-plank": "TIME", "acceleration-sprint": "DISTANCE" } as const)[id as "back-squat"];

describe("coach session edits", () => {
  it("accepts form values as strings", () => {
    const r = editedExerciseSchema.parse({ ...row, sets: "3", repMin: "5", repMax: "5", distanceM: "", targetRpe: "7.5", restSec: "120" });
    expect(r).toMatchObject({ sets: 3, repMin: 5, targetRpe: 7.5, distanceM: null });
  });

  it("rejects reps 'to' below 'from', unknown exercises, out-of-range seconds and sprints without a distance", () => {
    expect(firstInvalidRow([row], measure)).toBe(-1);
    expect(firstInvalidRow([row, { ...row, repMin: 8, repMax: 6 }], measure)).toBe(1);
    expect(firstInvalidRow([{ ...row, exerciseId: "nope" }], measure)).toBe(0);
    expect(firstInvalidRow([{ ...row, exerciseId: "copenhagen-plank", repMin: 2, repMax: 30 }], measure)).toBe(0);
    expect(firstInvalidRow([{ ...row, exerciseId: "acceleration-sprint", repMin: 1, repMax: 1 }], measure)).toBe(0);
    expect(firstInvalidRow([{ ...row, exerciseId: "acceleration-sprint", repMin: 1, repMax: 1, distanceM: 30 }], measure)).toBe(-1);
  });

  it("switching measure resets reps to sensible defaults", () => {
    expect(defaultsFor("TIME")).toEqual({ repMin: 20, repMax: 30, distanceM: null });
    expect(defaultsFor("DISTANCE").distanceM).toBe(20);
  });

  it("copies into a deload week with fewer sets and RPE 6 at most, never more sets", () => {
    expect(asDeload(row)).toMatchObject({ sets: 2, targetRpe: 6 });
    expect(asDeload({ ...row, sets: 1, targetRpe: 5 })).toMatchObject({ sets: 1, targetRpe: 5 });
  });
});
