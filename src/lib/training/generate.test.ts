import { describe, expect, it } from "vitest";
import { buildWeekTemplate, generateProgram, prescribe, type ProgramContext, type TrainingPrefInput } from "./generate";
import { EXERCISES } from "./library";
import { classifyDay, isHardOnLegs } from "./sessions";
import { weekdayOf } from "../dates";

const base: TrainingPrefInput = { weekdays: [0, 2, 4], sessionMinutes: 60, experience: "INTERMEDIATE", equipment: "GYM", injuries: [] };
const football: ProgramContext = { sport: "football", phase: "OFF_SEASON", matchWeekdays: [] };
const byId = new Map(EXERCISES.map((e) => [e.id, e]));
const BODYBUILDING = ["pec-deck", "cable-fly", "barbell-curl", "skull-crusher", "lateral-raise", "cable-kickback", "leg-extension"];

describe("S&C generator", () => {
  it("off-season team sport, 3 days: lower, upper, power & speed", () => {
    const t = buildWeekTemplate(base, football, EXERCISES);
    expect(t.map((d) => d.focus)).toEqual(["STRENGTH_LOWER", "STRENGTH_UPPER", "POWER_SPEED"]);
    t.forEach((d) => expect(d.exercises.length).toBeGreaterThan(2));
  });

  it("has no bodybuilding isolation exercises", () => {
    for (const id of BODYBUILDING) expect(byId.has(id), id).toBe(false);
  });

  it("endurance athletes get no extra conditioning sessions", () => {
    for (const phase of ["OFF_SEASON", "PRE_SEASON", "IN_SEASON"] as const) {
      const t = buildWeekTemplate({ ...base, weekdays: [0, 1, 3, 5] }, { sport: "swimming", phase, matchWeekdays: [] }, EXERCISES);
      expect(t.some((d) => d.focus === "CONDITIONING"), phase).toBe(false);
    }
  });

  it("combat sports add grip and neck work", () => {
    const t = buildWeekTemplate({ ...base, weekdays: [0] }, { sport: "wrestling", phase: "OFF_SEASON", matchWeekdays: [] }, EXERCISES);
    const ids = t[0].exercises.map((e) => e.exerciseId);
    expect(ids).toContain("neck-isometric");
    expect(ids).toContain("farmer-carry");
  });

  it("respects injuries and holds back technical lifts for beginners", () => {
    const t = buildWeekTemplate({ ...base, injuries: ["KNEE"], experience: "BEGINNER" }, { ...football, phase: "PRE_SEASON" }, EXERCISES);
    for (const e of t.flatMap((d) => d.exercises)) {
      expect(byId.get(e.exerciseId)!.stresses).not.toContain("KNEE");
      expect(["hang-power-clean", "depth-jump"]).not.toContain(e.exerciseId);
    }
  });

  it("loads strength by phase: off-season volume, pre-season heavy, in-season low volume", () => {
    const squat = byId.get("back-squat")!;
    const off = prescribe(squat, "strength", "OFF_SEASON", "INTERMEDIATE");
    const pre = prescribe(squat, "strength", "PRE_SEASON", "INTERMEDIATE");
    const inS = prescribe(squat, "strength", "IN_SEASON", "INTERMEDIATE");
    expect([off.repMin, off.repMax]).toEqual([6, 8]);
    expect(pre.repMax).toBeLessThanOrEqual(5);
    expect(pre.targetRpe).toBeGreaterThan(off.targetRpe);
    expect(inS.sets).toBeLessThan(off.sets);
  });

  it("prescribes sprints by distance and holds by seconds", () => {
    const sprint = prescribe(byId.get("acceleration-sprint")!, "speed", "PRE_SEASON", "INTERMEDIATE");
    expect(sprint).toMatchObject({ repMin: 1, repMax: 1, distanceM: 20 });
    const plank = prescribe(byId.get("copenhagen-plank")!, "prehab", "IN_SEASON", "INTERMEDIATE");
    expect(plank.repMin).toBeGreaterThanOrEqual(20);
    expect(plank.distanceM).toBeNull();
  });
});

describe("match-day scheduling", () => {
  it("classifies days around a Friday match", () => {
    // 3 Wed, 4 Thu = MD-2, MD-1; 5 Fri = MD; 6 Sat = MD+1
    expect([3, 4, 5, 6, 0].map((d) => classifyDay(d, [5]))).toEqual(["PRE_MATCH", "PRE_MATCH", "RECOVERY", "RECOVERY", "FREE"]);
  });

  it("no heavy leg or plyometric session in the 2 days before a match, recovery only the day after", () => {
    const ctx: ProgramContext = { sport: "football", phase: "IN_SEASON", matchWeekdays: [5] };
    const t = buildWeekTemplate({ ...base, weekdays: [3, 4, 6] }, ctx, EXERCISES);
    const byDay = new Map(t.map((d) => [d.weekday, d.focus]));
    expect(isHardOnLegs(byDay.get(3)!)).toBe(false);
    expect(isHardOnLegs(byDay.get(4)!)).toBe(false);
    expect(byDay.get(6)).toBe("PREHAB_MOBILITY");
  });

  it("keeps the main strength session on a free day", () => {
    const ctx: ProgramContext = { sport: "football", phase: "IN_SEASON", matchWeekdays: [5] };
    const t = buildWeekTemplate({ ...base, weekdays: [1, 4] }, ctx, EXERCISES);
    expect(t.find((d) => d.weekday === 1)!.focus).toBe("TOTAL_STRENGTH_POWER");
    expect(isHardOnLegs(t.find((d) => d.weekday === 4)!.focus)).toBe(false);
  });

  it("4-week block lands on chosen weekdays and deloads week 4", () => {
    const days = generateProgram(base, football, EXERCISES, "2026-11-01");
    expect(days).toHaveLength(12);
    days.forEach((d) => expect([0, 2, 4]).toContain(weekdayOf(d.day)));
    const w1 = days.filter((d) => d.weekNumber === 1);
    const w4 = days.filter((d) => d.weekNumber === 4);
    expect(w4.every((d) => d.isDeload)).toBe(true);
    const sets = (ds: typeof days) => ds.flatMap((d) => d.exercises).reduce((a, e) => a + e.sets, 0);
    expect(sets(w4)).toBeLessThan(sets(w1));
    expect(Math.max(...w4.flatMap((d) => d.exercises.map((e) => e.targetRpe)))).toBeLessThanOrEqual(6);
    const rpe = (w: number) => days.find((d) => d.weekNumber === w)!.exercises[1].targetRpe;
    expect(rpe(3)).toBeGreaterThan(rpe(1));
  });

  it("in-season effort stays flat across weeks 1-3", () => {
    const days = generateProgram(base, { ...football, phase: "IN_SEASON" }, EXERCISES, "2026-11-01");
    const first = (w: number) => days.find((d) => d.weekNumber === w)!.exercises.map((e) => e.targetRpe);
    expect(first(3)).toEqual(first(1));
  });
});
