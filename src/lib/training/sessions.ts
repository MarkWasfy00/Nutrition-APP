import type { SeasonPhase } from "@prisma/client";
import type { SportCategory } from "../sports";
import type { Pattern } from "./library";

/** S&C session types. They replace gym bodybuilding splits. */
export type SessionType =
  | "STRENGTH_LOWER" | "STRENGTH_UPPER" | "TOTAL_STRENGTH_POWER" | "POWER_SPEED" | "CONDITIONING" | "PREHAB_MOBILITY";

export const SESSION_TYPES: SessionType[] = [
  "STRENGTH_LOWER", "STRENGTH_UPPER", "TOTAL_STRENGTH_POWER", "POWER_SPEED", "CONDITIONING", "PREHAB_MOBILITY",
];

/** How a slot is loaded (see `prescribe` in generate.ts). */
export type Role = "power" | "strength" | "accessory" | "plyo" | "speed" | "conditioning" | "core" | "prehab" | "mobility";

export type Slot = { patterns: Pattern[]; role: Role; heavy?: boolean };

const s = (patterns: Pattern | Pattern[], role: Role, heavy = false): Slot => ({ patterns: Array.isArray(patterns) ? patterns : [patterns], role, heavy });

/** Slots in priority order: a shorter session keeps the first ones. */
export const SESSION_SLOTS: Record<SessionType, Slot[]> = {
  STRENGTH_LOWER: [s(["power", "jump"], "power"), s("squat", "strength", true), s("hinge", "strength", true), s("single-leg", "accessory"), s("prehab", "prehab"), s("core", "core"), s("prehab", "prehab")],
  STRENGTH_UPPER: [s("throw", "plyo"), s("push", "strength", true), s("pull", "strength", true), s("push", "accessory"), s("pull", "accessory"), s("prehab", "prehab"), s("core", "core")],
  TOTAL_STRENGTH_POWER: [s("jump", "plyo"), s(["squat", "hinge"], "strength", true), s("push", "strength", true), s("pull", "strength", true), s("single-leg", "accessory"), s("core", "core"), s("prehab", "prehab")],
  POWER_SPEED: [s("sprint", "speed"), s("jump", "plyo"), s("throw", "plyo"), s("power", "power"), s("agility", "speed"), s("prehab", "prehab"), s("core", "core")],
  CONDITIONING: [s("conditioning", "conditioning"), s("agility", "speed"), s("conditioning", "conditioning"), s("carry", "core"), s("core", "core"), s("mobility", "mobility")],
  PREHAB_MOBILITY: [s("mobility", "mobility"), s("prehab", "prehab"), s("mobility", "mobility"), s("prehab", "prehab"), s("core", "core"), s("prehab", "prehab"), s("mobility", "mobility")],
};

/** Combat sports: grip and neck work at the end of upper / total sessions. */
export const COMBAT_EXTRAS: Slot[] = [s("carry", "core"), s("neck", "prehab")];

type Table = Record<SeasonPhase, SessionType[][]>; // [n-1] = sessions for n S&C days, priority order

const L: SessionType = "STRENGTH_LOWER", U: SessionType = "STRENGTH_UPPER", T: SessionType = "TOTAL_STRENGTH_POWER";
const P: SessionType = "POWER_SPEED", C: SessionType = "CONDITIONING", R: SessionType = "PREHAB_MOBILITY";

/**
 * Weekly templates by sport category and season phase.
 * Team sports get their conditioning from practice in-season, endurance athletes from their sport,
 * so those templates spend S&C time on strength, power and injury prevention.
 */
export const WEEK_TEMPLATES: Record<SportCategory, Table> = {
  TEAM: {
    OFF_SEASON: [[T], [L, U], [L, U, P], [L, U, P, C]],
    PRE_SEASON: [[T], [T, P], [L, U, P], [L, U, P, R]],
    IN_SEASON: [[T], [T, R], [T, P, R], [T, P, U, R]],
  },
  RACKET: {
    OFF_SEASON: [[T], [L, U], [L, U, P], [L, U, P, C]],
    PRE_SEASON: [[T], [T, P], [L, U, P], [L, U, P, R]],
    IN_SEASON: [[T], [T, R], [T, P, R], [T, P, U, R]],
  },
  ENDURANCE: {
    OFF_SEASON: [[T], [L, U], [L, U, R], [L, U, T, R]],
    PRE_SEASON: [[T], [T, R], [L, U, R], [L, U, P, R]],
    IN_SEASON: [[T], [T, R], [T, U, R], [T, U, R, R]],
  },
  SPEED_POWER: {
    OFF_SEASON: [[T], [L, U], [L, U, P], [L, U, P, T]],
    PRE_SEASON: [[P], [P, T], [P, L, U], [P, L, U, P]],
    IN_SEASON: [[P], [P, T], [P, T, R], [P, T, U, R]],
  },
  COMBAT: {
    OFF_SEASON: [[T], [L, U], [L, U, C], [L, U, C, P]],
    PRE_SEASON: [[T], [T, C], [T, C, P], [T, C, P, U]],
    IN_SEASON: [[T], [T, R], [T, C, R], [T, C, U, R]],
  },
  OTHER: {
    OFF_SEASON: [[T], [L, U], [L, U, P], [L, U, P, R]],
    PRE_SEASON: [[T], [T, P], [L, U, P], [L, U, P, R]],
    IN_SEASON: [[T], [T, R], [T, P, R], [T, P, U, R]],
  },
};

export function weekSessions(category: SportCategory, phase: SeasonPhase, days: number): SessionType[] {
  const rows = WEEK_TEMPLATES[category][phase];
  const n = Math.min(rows.length, Math.max(1, days));
  return [...rows[n - 1]];
}

/** Sessions that load the legs or the nervous system hard: not in the 2 days before a match. */
const HARD_ON_LEGS = new Set<SessionType>(["STRENGTH_LOWER", "TOTAL_STRENGTH_POWER", "POWER_SPEED", "CONDITIONING"]);
const SAFE_BEFORE_MATCH = new Set<SessionType>(["STRENGTH_UPPER", "PREHAB_MOBILITY"]);

export type DayClass = "FREE" | "PRE_MATCH" | "RECOVERY";

/** MD = match day. MD and MD+1 are recovery only; MD-1 and MD-2 avoid heavy legs and plyometrics. */
export function classifyDay(weekday: number, matchWeekdays: number[]): DayClass {
  let cls: DayClass = "FREE";
  for (const m of matchWeekdays) {
    const before = (m - weekday + 7) % 7; // days until the match
    const after = (weekday - m + 7) % 7; // days since the match
    if (before === 0 || after === 1) return "RECOVERY";
    if (before === 1 || before === 2) cls = "PRE_MATCH";
  }
  return cls;
}

export const isHardOnLegs = (s: SessionType) => HARD_ON_LEGS.has(s);

/**
 * Places the week's sessions on the athlete's S&C weekdays around match days.
 * Always returns one session per weekday, keeping the highest-priority sessions where possible.
 */
export function scheduleWeek(sessions: SessionType[], weekdays: number[], matchWeekdays: number[]): { weekday: number; session: SessionType }[] {
  const days = [...weekdays].sort((a, b) => a - b);
  const pool = [...sessions];
  while (pool.length < days.length) pool.push("PREHAB_MOBILITY");
  pool.length = days.length;
  const cls = days.map((d) => classifyDay(d, matchWeekdays));
  const out: (SessionType | null)[] = days.map(() => null);

  const take = (ok: (s: SessionType) => boolean) => {
    const i = pool.findIndex(ok);
    return i >= 0 ? pool.splice(i, 1)[0] : null;
  };
  const used = () => [...out, ...pool];

  cls.forEach((c, i) => {
    if (c !== "RECOVERY") return;
    out[i] = take((s) => s === "PREHAB_MOBILITY") ?? (pool.pop(), "PREHAB_MOBILITY");
  });
  cls.forEach((c, i) => {
    if (c !== "PRE_MATCH") return;
    const safe = take((s) => SAFE_BEFORE_MATCH.has(s));
    if (safe) { out[i] = safe; return; }
    pool.pop(); // drop the lowest-priority remaining session
    out[i] = used().includes("STRENGTH_UPPER") ? "PREHAB_MOBILITY" : "STRENGTH_UPPER";
  });
  cls.forEach((c, i) => {
    if (c === "FREE") out[i] = pool.shift() ?? "PREHAB_MOBILITY";
  });
  return days.map((weekday, i) => ({ weekday, session: out[i]! }));
}
