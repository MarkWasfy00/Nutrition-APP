import { describe, expect, it } from "vitest";
import type { Experience, Split } from "@prisma/client";
import { buildWeekTemplate, generateProgram, setsPerMuscle, VOLUME_RANGE, type TrainingPrefInput } from "./generate";
import { EXERCISES } from "./library";
import { weekdayOf } from "../dates";

const base: TrainingPrefInput = {
  split: "PPL", weekdays: [0, 1, 2, 3, 4, 5], sessionMinutes: 75, experience: "INTERMEDIATE", equipment: "GYM", injuries: [],
};

describe("training generator", () => {
  it.each<[Split, number, string[]]>([
    ["PPL", 6, ["PUSH", "PULL", "LEGS", "PUSH", "PULL", "LEGS"]],
    ["UPPER_LOWER", 4, ["UPPER", "LOWER", "UPPER", "LOWER"]],
    ["FULL_BODY", 3, ["FULL_A", "FULL_B", "FULL_A"]],
    ["BRO_SPLIT", 5, ["CHEST", "BACK", "LEGS", "SHOULDERS", "ARMS"]],
    ["ARNOLD", 6, ["CHEST_BACK", "SHOULDERS_ARMS", "LEGS", "CHEST_BACK", "SHOULDERS_ARMS", "LEGS"]],
  ])("%s with %i days yields the right focuses", (split, n, focuses) => {
    const t = buildWeekTemplate({ ...base, split, weekdays: [0, 1, 2, 3, 4, 5, 6].slice(0, n) }, EXERCISES);
    expect(t.map((d) => d.focus)).toEqual(focuses);
    t.forEach((d) => expect(d.exercises.length).toBeGreaterThan(0));
  });

  it.each<[Split, number, Experience]>([
    ["PPL", 6, "INTERMEDIATE"],
    ["UPPER_LOWER", 4, "ADVANCED"],
    ["FULL_BODY", 3, "BEGINNER"],
  ])("%s %i days %s keeps major-muscle weekly sets in range", (split, n, experience) => {
    const t = buildWeekTemplate({ ...base, split, experience, weekdays: [1, 2, 3, 4, 5, 6].slice(0, n) }, EXERCISES);
    const v = setsPerMuscle(t);
    const range = VOLUME_RANGE[experience];
    for (const m of ["chest", "back", "quads", "hamstrings"]) {
      expect(v[m], m).toBeGreaterThanOrEqual(range.min);
      expect(v[m], m).toBeLessThanOrEqual(range.max);
    }
  });

  it("respects equipment and injuries", () => {
    const t = buildWeekTemplate({ ...base, equipment: "HOME", injuries: ["KNEE"] }, EXERCISES);
    const ids = new Set(t.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
    for (const id of ids) {
      const ex = EXERCISES.find((e) => e.id === id)!;
      expect(ex.equipment).toContain("HOME");
      expect(ex.stresses).not.toContain("KNEE");
    }
  });

  it("4-week block lands on chosen weekdays and deloads week 4", () => {
    const days = generateProgram({ ...base, weekdays: [0, 2, 4] , split: "FULL_BODY" }, EXERCISES, "2026-11-01");
    expect(days).toHaveLength(12);
    days.forEach((d) => expect([0, 2, 4]).toContain(weekdayOf(d.day)));
    const w1 = days.filter((d) => d.weekNumber === 1);
    const w4 = days.filter((d) => d.weekNumber === 4);
    expect(w4.every((d) => d.isDeload)).toBe(true);
    const sets = (ds: typeof days) => ds.flatMap((d) => d.exercises).reduce((a, e) => a + e.sets, 0);
    expect(sets(w4)).toBeLessThan(sets(w1));
    expect(w1[0].exercises[0].targetRpe).toBe(7);
    expect(days.find((d) => d.weekNumber === 3)!.exercises[0].targetRpe).toBe(8);
    expect(w4[0].exercises[0].targetRpe).toBe(6);
  });
});
