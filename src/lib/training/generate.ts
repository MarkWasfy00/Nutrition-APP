import type { Equipment, ExerciseMeasure, Experience, SeasonPhase } from "@prisma/client";
import { addDays, weekdayOf } from "../dates";
import { sportCategory } from "../sports";
import { ADVANCED_ONLY, DISTANCE_M } from "./library";
import { COMBAT_EXTRAS, scheduleWeek, SESSION_SLOTS, weekSessions, type Role, type SessionType, type Slot } from "./sessions";

export type LibraryExercise = {
  id: string;
  /** movement pattern */
  muscle: string;
  measure: ExerciseMeasure;
  equipment: Equipment[];
  isCompound: boolean;
  stresses: string[];
};

export type TrainingPrefInput = {
  /** S&C weekdays, 0 = Sunday */
  weekdays: number[];
  sessionMinutes: number;
  experience: Experience;
  equipment: Equipment;
  injuries: string[];
};

/** Team / sport context the program is built around. */
export type ProgramContext = { sport: string; phase: SeasonPhase; matchWeekdays: number[] };

export type GeneratedExercise = {
  exerciseId: string;
  muscle: string;
  order: number;
  sets: number;
  repMin: number;
  repMax: number;
  targetRpe: number;
  restSec: number;
  distanceM: number | null;
};

export type GeneratedDay = {
  weekNumber: number;
  day: string;
  focus: SessionType;
  isDeload: boolean;
  exercises: GeneratedExercise[];
};

export type TemplateDay = { weekday: number; focus: SessionType; exercises: GeneratedExercise[] };

function maxExercises(minutes: number) {
  if (minutes <= 45) return 4;
  if (minutes <= 60) return 5;
  if (minutes <= 75) return 6;
  return 7;
}

type Dose = { sets: number; repMin: number; repMax: number; rpe: number; rest: number };
const d = (sets: number, repMin: number, repMax: number, rpe: number, rest: number): Dose => ({ sets, repMin, repMax, rpe, rest });

/**
 * Loading by role and season phase (classic periodization):
 * - off-season: active recovery, low volume and intensity, fix weak spots
 * - general preparation: build strength and work capacity (moderate reps, most volume)
 * - specific preparation: heavier strength, more power and sport-specific conditioning
 * - pre-competition: convert strength to power and speed (heavy, low reps, more plyometrics)
 * - competition: maintain with low volume, stay fresh for matches
 */
const DOSE: Record<Role, Record<SeasonPhase, Dose>> = {
  power: { OFF_SEASON: d(2, 3, 5, 6, 120), GENERAL_PREP: d(3, 4, 5, 7, 150), SPECIFIC_PREP: d(4, 3, 4, 7.5, 180), PRE_COMPETITION: d(4, 2, 3, 7.5, 180), COMPETITION: d(3, 2, 3, 7, 150) },
  strength: { OFF_SEASON: d(3, 8, 10, 6.5, 120), GENERAL_PREP: d(4, 6, 8, 7.5, 150), SPECIFIC_PREP: d(4, 4, 6, 8, 180), PRE_COMPETITION: d(4, 3, 5, 8, 180), COMPETITION: d(3, 3, 5, 7, 150) },
  accessory: { OFF_SEASON: d(2, 10, 15, 6.5, 60), GENERAL_PREP: d(3, 8, 12, 7, 90), SPECIFIC_PREP: d(3, 6, 10, 7.5, 90), PRE_COMPETITION: d(3, 6, 8, 7.5, 90), COMPETITION: d(2, 6, 8, 7, 90) },
  plyo: { OFF_SEASON: d(2, 4, 5, 6, 90), GENERAL_PREP: d(3, 5, 5, 7, 90), SPECIFIC_PREP: d(4, 4, 5, 7.5, 90), PRE_COMPETITION: d(4, 4, 5, 7.5, 90), COMPETITION: d(3, 3, 4, 7, 90) },
  speed: { OFF_SEASON: d(3, 1, 1, 7, 120), GENERAL_PREP: d(4, 1, 1, 8, 120), SPECIFIC_PREP: d(5, 1, 1, 8.5, 150), PRE_COMPETITION: d(6, 1, 1, 9, 150), COMPETITION: d(4, 1, 1, 8.5, 150) },
  conditioning: { OFF_SEASON: d(6, 30, 30, 7, 60), GENERAL_PREP: d(8, 30, 30, 8, 60), SPECIFIC_PREP: d(10, 30, 30, 8.5, 60), PRE_COMPETITION: d(10, 30, 30, 8.5, 60), COMPETITION: d(6, 30, 30, 8, 60) },
  core: { OFF_SEASON: d(2, 10, 12, 6.5, 60), GENERAL_PREP: d(3, 8, 12, 7, 60), SPECIFIC_PREP: d(3, 8, 10, 7, 60), PRE_COMPETITION: d(3, 8, 10, 7, 60), COMPETITION: d(2, 8, 10, 7, 60) },
  prehab: { OFF_SEASON: d(3, 10, 12, 6, 60), GENERAL_PREP: d(3, 8, 10, 6.5, 60), SPECIFIC_PREP: d(3, 8, 10, 6.5, 60), PRE_COMPETITION: d(3, 6, 8, 6.5, 60), COMPETITION: d(2, 6, 8, 6.5, 60) },
  mobility: { OFF_SEASON: d(2, 6, 8, 5, 30), GENERAL_PREP: d(2, 6, 8, 5, 30), SPECIFIC_PREP: d(2, 6, 8, 5, 30), PRE_COMPETITION: d(2, 6, 8, 5, 30), COMPETITION: d(2, 6, 8, 5, 30) },
};

/** Phases where advanced athletes get an extra strength set (not recovery or match weeks). */
const BUILD_PHASES = new Set<SeasonPhase>(["GENERAL_PREP", "SPECIFIC_PREP", "PRE_COMPETITION"]);

/** Work interval in seconds for TIME exercises, by role. */
const SECONDS: Partial<Record<Role, [number, number]>> = {
  conditioning: [30, 30], core: [20, 30], prehab: [20, 30], mobility: [30, 45],
};

const LOADED_ROLES = new Set<Role>(["power", "strength", "plyo"]);

export function prescribe(ex: Pick<LibraryExercise, "id" | "measure">, role: Role, phase: SeasonPhase, experience: Experience) {
  const base = DOSE[role][phase];
  let sets = base.sets;
  if (LOADED_ROLES.has(role)) {
    if (experience === "BEGINNER") sets = Math.max(2, sets - 1);
    if (experience === "ADVANCED" && role === "strength" && BUILD_PHASES.has(phase)) sets = Math.min(5, sets + 1);
  }
  let { repMin, repMax } = base;
  let distanceM: number | null = null;
  if (ex.measure === "TIME") [repMin, repMax] = SECONDS[role] ?? [20, 30];
  if (ex.measure === "DISTANCE") {
    repMin = repMax = 1;
    distanceM = DISTANCE_M[ex.id] ?? 20;
  }
  // Nordics: low reps, the eccentric is brutal.
  if (ex.id === "nordic-curl") { repMin = 3; repMax = 6; }
  return { sets, repMin, repMax, targetRpe: base.rpe, restSec: base.rest, distanceM };
}

/** One week of sessions, keyed to the athlete's S&C weekdays; reused for all 4 weeks. */
export function buildWeekTemplate(pref: TrainingPrefInput, ctx: ProgramContext, library: LibraryExercise[]): TemplateDay[] {
  const category = sportCategory(ctx.sport);
  const allowed = library.filter(
    (e) =>
      e.equipment.includes(pref.equipment) &&
      !e.stresses.some((s) => pref.injuries.includes(s)) &&
      !(pref.experience === "BEGINNER" && ADVANCED_ONLY.has(e.id)),
  );
  const schedule = scheduleWeek(weekSessions(category, ctx.phase, pref.weekdays.length), pref.weekdays, ctx.matchWeekdays);
  const seen: Record<string, number> = {};
  const limit = maxExercises(pref.sessionMinutes);

  return schedule.map(({ weekday, session }) => {
    const variant = (seen[session] = (seen[session] ?? -1) + 1);
    let slots: Slot[] = SESSION_SLOTS[session].slice(0, limit);
    if (category === "COMBAT" && (session === "STRENGTH_UPPER" || session === "TOTAL_STRENGTH_POWER")) {
      slots = [...slots.slice(0, Math.max(1, limit - COMBAT_EXTRAS.length)), ...COMBAT_EXTRAS];
    }
    const used = new Set<string>();
    const picks: GeneratedExercise[] = [];
    slots.forEach((slot, k) => {
      const fits = (e: LibraryExercise) => slot.patterns.includes(e.muscle as never) && !used.has(e.id);
      let pool = allowed.filter((e) => fits(e) && (!slot.heavy || e.isCompound));
      if (pool.length === 0) pool = allowed.filter(fits);
      if (pool.length === 0) return;
      const ex = pool[(variant + k) % pool.length];
      used.add(ex.id);
      picks.push({ exerciseId: ex.id, muscle: ex.muscle, order: picks.length + 1, ...prescribe(ex, slot.role, ctx.phase, pref.experience) });
    });
    return { weekday, focus: session, exercises: picks };
  });
}

/** RPE added in weeks 1-3; off-season and competition stay flat (recovery, fresh for matches). */
const RAMP: Record<SeasonPhase, number[]> = {
  OFF_SEASON: [0, 0, 0], GENERAL_PREP: [0, 0.5, 1], SPECIFIC_PREP: [0, 0.5, 1], PRE_COMPETITION: [0, 0.5, 1], COMPETITION: [0, 0, 0],
};
const DELOAD_RPE = 6;

/** 4-week block: weeks 1-3 build, week 4 deloads (~60% sets, RPE 6). */
export function generateProgram(pref: TrainingPrefInput, ctx: ProgramContext, library: LibraryExercise[], startDay: string): GeneratedDay[] {
  const template = buildWeekTemplate(pref, ctx, library);
  const byWeekday = new Map(template.map((t) => [t.weekday, t]));
  const out: GeneratedDay[] = [];

  for (let w = 0; w < 4; w++) {
    for (let i = 0; i < 7; i++) {
      const day = addDays(startDay, w * 7 + i);
      const t = byWeekday.get(weekdayOf(day));
      if (!t) continue;
      const deload = w === 3;
      out.push({
        weekNumber: w + 1,
        day,
        focus: t.focus,
        isDeload: deload,
        exercises: t.exercises.map((e) => ({
          ...e,
          sets: deload ? Math.max(2, Math.round(e.sets * 0.6)) : e.sets,
          targetRpe: deload ? Math.min(DELOAD_RPE, e.targetRpe) : Math.min(9.5, e.targetRpe + RAMP[ctx.phase][w]),
        })),
      });
    }
  }
  return out;
}
