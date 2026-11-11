import { describe, expect, it } from "vitest";
import {
  abilityProfile, assignmentSchema, bestScore, canRecord, inputStep, latestScores, parseScore, scoreChange, teamPercentile, testById,
  testSummary,
} from "./biomotor";

const today = "2026-11-11";
const sprint = testById("sprint-10m")!;
const cmj = testById("cmj")!;
const reach = testById("sit-and-reach")!;

describe("biomotor", () => {
  it("parses an assignment form, keeps tests in library order and drops duplicates", () => {
    const a = assignmentSchema(today).parse({ day: today, tests: ["sprint-10m", "cmj", "sprint-10m"], title: " ", notes: "", athleteId: "" });
    expect(a).toMatchObject({ tests: ["cmj", "sprint-10m"], title: null, notes: null, athleteId: null });
  });

  it("rejects no tests, unknown tests and dates outside the window, but keeps an existing date", () => {
    const bad = (v: object, keep?: string) => !assignmentSchema(today, keep).safeParse({ day: today, tests: ["cmj"], ...v }).success;
    expect(bad({ tests: [] })).toBe(true);
    expect(bad({ tests: ["bleep"] })).toBe(true);
    expect(bad({ day: "2026-01-01" })).toBe(true);
    expect(bad({ day: "2026-01-01" }, "2026-01-01")).toBe(false);
  });

  it("opens results on the testing day", () => {
    expect(canRecord({ day: "2026-11-12" }, today)).toBe(false);
    expect(canRecord({ day: today }, today)).toBe(true);
  });

  it("parses scores: empty clears, rounds, accepts comma and Arabic digits, rejects out-of-range", () => {
    expect(parseScore(sprint, "")).toBeNull();
    expect(parseScore(sprint, " 1.876 ")).toBe(1.88);
    expect(parseScore(sprint, "1,9")).toBe(1.9);
    expect(parseScore(cmj, "٤٢٫٥")).toBe(42.5);
    expect(parseScore(reach, "-4")).toBe(-4);
    expect(parseScore(sprint, "45")).toBe("invalid");
    expect(parseScore(sprint, "fast")).toBe("invalid");
    expect(parseScore(sprint, null)).toBe("invalid");
    expect(inputStep(sprint)).toBe("0.01");
    expect(inputStep(testById("broad-jump")!)).toBe("1");
  });

  it("knows lower times and higher jumps are better", () => {
    expect(bestScore(sprint, [1.95, 1.82, 2.01])).toBe(1.82);
    expect(bestScore(cmj, [38, 44.5, 41])).toBe(44.5);
    expect(bestScore(cmj, [])).toBeNull();
    expect(scoreChange(sprint, 1.82, 1.9)).toEqual({ delta: -0.08, pct: -4.2, improved: true });
    expect(scoreChange(cmj, 40, 42)).toMatchObject({ delta: -2, improved: false });
    expect(scoreChange(cmj, 40, 40).improved).toBeNull();
  });

  it("scores against teammates, ties count half", () => {
    expect(teamPercentile(sprint, 1.8, [1.9, 2.0, 1.7, 1.8])).toBe(63);
    expect(teamPercentile(cmj, 50, [40, 45])).toBe(100);
    expect(teamPercentile(cmj, 50, [])).toBeNull();
  });

  it("builds a profile from each athlete's latest score", () => {
    const latest = latestScores([
      { athleteId: "a", testId: "cmj", value: 30, day: "2026-09-01" },
      { athleteId: "a", testId: "cmj", value: 48, day: "2026-11-01" },
      { athleteId: "b", testId: "cmj", value: 40, day: "2026-11-01" },
      { athleteId: "a", testId: "sprint-10m", value: 2.0, day: "2026-11-01" },
      { athleteId: "b", testId: "sprint-10m", value: 1.8, day: "2026-11-01" },
      { athleteId: "a", testId: "t-test", value: 10, day: "2026-11-01" },
    ]);
    expect(latest.get("cmj")?.get("a")).toEqual({ value: 48, day: "2026-11-01" });
    const profile = Object.fromEntries(abilityProfile("a", latest).map((p) => [p.ability, p.score]));
    expect(profile).toMatchObject({ POWER: 100, SPEED: 0, AGILITY: null, STRENGTH: null });
  });

  it("summarises a test across the squad with shared ranks", () => {
    const s = testSummary(sprint, [{ athleteId: "a", value: 1.9 }, { athleteId: "b", value: 1.8 }, { athleteId: "c", value: 1.9 }]);
    expect(s).toMatchObject({ n: 3, mean: 1.87, best: 1.8, worst: 1.9 });
    expect(s.rows.map((r) => [r.athleteId, r.rank])).toEqual([["b", 1], ["a", 2], ["c", 2]]);
    expect(testSummary(sprint, [])).toMatchObject({ n: 0, mean: null, best: null });
  });
});
