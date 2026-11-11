import { z } from "zod";
import { addDays } from "./dates";
import { SCHEDULE_WINDOW } from "./schedule";

/** Biomotor abilities, in report order. Safe to import from client components. */
export const ABILITIES = ["STRENGTH", "POWER", "SPEED", "AGILITY", "ENDURANCE", "FLEXIBILITY"] as const;
export type Ability = (typeof ABILITIES)[number];

export type TestUnit = "kg" | "cm" | "m" | "s" | "reps";

export type BiomotorTest = {
  id: string;
  ability: Ability;
  unit: TestUnit;
  /** Whether a higher or a lower score is better (times are lower-is-better). */
  better: "higher" | "lower";
  /** Accepted range, to catch typos (e.g. 45 s for a 10 m sprint). */
  min: number;
  max: number;
  /** Decimal places kept and shown. */
  decimals: number;
};

/** Standard field tests. Names and protocols live in messages under `biomotor.tests.<id>`. */
export const BIOMOTOR_TESTS: BiomotorTest[] = [
  { id: "back-squat-1rm", ability: "STRENGTH", unit: "kg", better: "higher", min: 10, max: 400, decimals: 1 },
  { id: "bench-press-1rm", ability: "STRENGTH", unit: "kg", better: "higher", min: 10, max: 300, decimals: 1 },
  { id: "handgrip", ability: "STRENGTH", unit: "kg", better: "higher", min: 5, max: 120, decimals: 1 },
  { id: "push-ups", ability: "STRENGTH", unit: "reps", better: "higher", min: 0, max: 200, decimals: 0 },
  { id: "cmj", ability: "POWER", unit: "cm", better: "higher", min: 5, max: 100, decimals: 1 },
  { id: "broad-jump", ability: "POWER", unit: "cm", better: "higher", min: 50, max: 400, decimals: 0 },
  { id: "mb-chest-throw", ability: "POWER", unit: "m", better: "higher", min: 1, max: 30, decimals: 2 },
  { id: "sprint-10m", ability: "SPEED", unit: "s", better: "lower", min: 1.2, max: 4, decimals: 2 },
  { id: "sprint-30m", ability: "SPEED", unit: "s", better: "lower", min: 3, max: 8, decimals: 2 },
  { id: "t-test", ability: "AGILITY", unit: "s", better: "lower", min: 7, max: 20, decimals: 2 },
  { id: "pro-agility", ability: "AGILITY", unit: "s", better: "lower", min: 3.5, max: 10, decimals: 2 },
  { id: "illinois", ability: "AGILITY", unit: "s", better: "lower", min: 12, max: 30, decimals: 2 },
  { id: "yoyo-ir1", ability: "ENDURANCE", unit: "m", better: "higher", min: 40, max: 4000, decimals: 0 },
  { id: "cooper-12min", ability: "ENDURANCE", unit: "m", better: "higher", min: 500, max: 5000, decimals: 0 },
  { id: "sit-and-reach", ability: "FLEXIBILITY", unit: "cm", better: "higher", min: -30, max: 60, decimals: 1 },
];

export const TEST_IDS = BIOMOTOR_TESTS.map((t) => t.id) as [string, ...string[]];
const BY_ID = new Map(BIOMOTOR_TESTS.map((t) => [t.id, t]));
export const testById = (id: string) => BY_ID.get(id);

/** `step` for a number input with this many decimals. */
export const inputStep = (test: Pick<BiomotorTest, "decimals">) => (test.decimals === 0 ? "1" : (10 ** -test.decimals).toFixed(test.decimals));

/** Tests of an assignment, known ones only, in library order. */
export const assignmentTests = (ids: string[]) => BIOMOTOR_TESTS.filter((t) => ids.includes(t.id));

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

/**
 * Form fields for an assignment. `tests` is every checked test id (FormData.getAll), `athleteId` "" = whole team.
 * `keepDay`: an existing assignment's date, accepted even when it is outside the usual window.
 */
export function assignmentSchema(today: string, keepDay?: string) {
  return z.object({
    title: optText(80),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((d) => d === keepDay || (d >= addDays(today, -SCHEDULE_WINDOW.pastDays) && d <= addDays(today, SCHEDULE_WINDOW.futureDays)), "range"),
    tests: z.array(z.enum(TEST_IDS)).min(1, "tests").transform((ids) => assignmentTests(ids).map((t) => t.id)),
    notes: optText(500),
    athleteId: z.string().optional().transform((v) => v || null),
  });
}

/** Results can be entered from the testing day on. */
export const canRecord = (assignment: { day: string }, today: string) => assignment.day <= today;

/** Form field name for one athlete's score on one test. */
export const resultField = (athleteId: string, testId: string) => `r:${athleteId}:${testId}`;

/**
 * A typed score: "" → null (clear it), a number in range → rounded value, anything else → "invalid".
 * Accepts a decimal comma and Arabic-Indic digits.
 */
export function parseScore(test: BiomotorTest, raw: FormDataEntryValue | null): number | null | "invalid" {
  if (typeof raw !== "string") return "invalid";
  const s = raw.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[,٫]/, ".");
  if (s === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return "invalid";
  const f = 10 ** test.decimals;
  const v = Math.round(Number(s) * f) / f;
  return v >= test.min && v <= test.max ? v : "invalid";
}

/** > 0 when `a` is the better score. */
export const compareScores = (test: Pick<BiomotorTest, "better">, a: number, b: number) => (test.better === "higher" ? a - b : b - a);

export const bestScore = (test: Pick<BiomotorTest, "better">, values: number[]) =>
  values.length === 0 ? null : values.reduce((best, v) => (compareScores(test, v, best) > 0 ? v : best));

/** Change from the previous score; `improved` is null when unchanged. */
export function scoreChange(test: BiomotorTest, current: number, previous: number) {
  const f = 10 ** test.decimals;
  const delta = Math.round((current - previous) * f) / f;
  const pct = previous !== 0 ? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10 : null;
  return { delta, pct, improved: delta === 0 ? null : compareScores(test, current, previous) > 0 };
}

/**
 * Team-relative score 0-100: the share of teammates this score beats (ties count half).
 * null when there is nobody to compare with.
 */
export function teamPercentile(test: Pick<BiomotorTest, "better">, value: number, others: number[]) {
  if (others.length === 0) return null;
  const beaten = others.reduce((n, o) => n + (compareScores(test, value, o) > 0 ? 1 : compareScores(test, value, o) === 0 ? 0.5 : 0), 0);
  return Math.round((beaten / others.length) * 100);
}

export type Score = { athleteId: string; testId: string; value: number; day: string };

/** Each athlete's most recent score per test (`Map<testId, Map<athleteId, value>>`). Later days win. */
export function latestScores(scores: Score[]) {
  const out = new Map<string, Map<string, { value: number; day: string }>>();
  for (const s of scores) {
    const byAthlete = out.get(s.testId) ?? new Map();
    const prev = byAthlete.get(s.athleteId);
    if (!prev || s.day >= prev.day) byAthlete.set(s.athleteId, { value: s.value, day: s.day });
    out.set(s.testId, byAthlete);
  }
  return out;
}

/**
 * Biomotor profile: per ability, the mean team percentile of the athlete's latest score on each test
 * of that ability. null for abilities the athlete has no comparable score in.
 */
export function abilityProfile(athleteId: string, latest: ReturnType<typeof latestScores>) {
  const perAbility = new Map<Ability, number[]>();
  for (const [testId, byAthlete] of latest) {
    const test = testById(testId);
    const own = byAthlete.get(athleteId);
    if (!test || !own) continue;
    const others = [...byAthlete].filter(([id]) => id !== athleteId).map(([, s]) => s.value);
    const p = teamPercentile(test, own.value, others);
    if (p == null) continue;
    perAbility.set(test.ability, [...(perAbility.get(test.ability) ?? []), p]);
  }
  return ABILITIES.map((ability) => {
    const ps = perAbility.get(ability);
    return { ability, score: ps ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null, tests: ps?.length ?? 0 };
  });
}

/** One test across a squad: how many scored, mean, best, and athletes ranked best first (ties share a rank). */
export function testSummary(test: BiomotorTest, scores: { athleteId: string; value: number }[]) {
  const ranked = [...scores].sort((a, b) => compareScores(test, b.value, a.value));
  const f = 10 ** test.decimals;
  const mean = ranked.length ? Math.round((ranked.reduce((s, r) => s + r.value, 0) / ranked.length) * f) / f : null;
  let rank = 0;
  const rows = ranked.map((r, i) => {
    if (i === 0 || compareScores(test, ranked[i - 1].value, r.value) !== 0) rank = i + 1;
    return { ...r, rank };
  });
  return { n: ranked.length, mean, best: ranked[0]?.value ?? null, worst: ranked.at(-1)?.value ?? null, rows };
}
