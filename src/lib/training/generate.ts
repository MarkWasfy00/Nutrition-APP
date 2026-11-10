import type { Equipment, Experience, Split } from "@prisma/client";
import { addDays, weekdayOf } from "../dates";
import { FOCUS_SLOTS, MAJOR_MUSCLES, weekFocuses } from "./splits";

export type LibraryExercise = {
  id: string;
  muscle: string;
  equipment: Equipment[];
  isCompound: boolean;
  stresses: string[];
};

export type TrainingPrefInput = {
  split: Split;
  weekdays: number[];
  sessionMinutes: number;
  experience: Experience;
  equipment: Equipment;
  injuries: string[];
};

export type GeneratedExercise = {
  exerciseId: string;
  muscle: string;
  order: number;
  sets: number;
  repMin: number;
  repMax: number;
  targetRpe: number;
  restSec: number;
};

export type GeneratedDay = {
  weekNumber: number;
  day: string;
  focus: string;
  isDeload: boolean;
  exercises: GeneratedExercise[];
};

export const VOLUME_RANGE: Record<Experience, { min: number; max: number }> = {
  BEGINNER: { min: 10, max: 14 },
  INTERMEDIATE: { min: 12, max: 18 },
  ADVANCED: { min: 14, max: 20 },
};

const WEEK_RPE = [7, 7.5, 8, 6];
const MAX_SETS = 5;
const MIN_SETS = 2;

function maxExercises(minutes: number) {
  if (minutes <= 45) return 4;
  if (minutes <= 60) return 5;
  if (minutes <= 75) return 6;
  return 7;
}

function baseSets(compound: boolean, exp: Experience) {
  if (exp === "BEGINNER") return compound ? 3 : 2;
  if (exp === "INTERMEDIATE") return compound ? 4 : 3;
  return 4;
}

function reps(compound: boolean, exp: Experience) {
  if (!compound) return { repMin: 10, repMax: 15 };
  return exp === "BEGINNER" ? { repMin: 8, repMax: 12 } : { repMin: 6, repMax: 10 };
}

type TemplateDay = { focus: string; exercises: GeneratedExercise[] };

/** One week's sessions (exercise selection + base volume), reused for all 4 weeks. */
export function buildWeekTemplate(pref: TrainingPrefInput, library: LibraryExercise[]): TemplateDay[] {
  const allowed = library.filter(
    (e) => e.equipment.includes(pref.equipment) && !e.stresses.some((s) => pref.injuries.includes(s)),
  );
  const focuses = weekFocuses(pref.split, pref.weekdays.length);
  const seen: Record<string, number> = {};

  const days: TemplateDay[] = focuses.map((focus) => {
    const variant = (seen[focus] = (seen[focus] ?? -1) + 1);
    const used = new Set<string>();
    const picks: GeneratedExercise[] = [];
    const slotCount: Record<string, number> = {};

    for (const slot of FOCUS_SLOTS[focus].slice(0, maxExercises(pref.sessionMinutes))) {
      const key = `${slot.muscle}:${slot.compound}`;
      const k = (slotCount[key] = (slotCount[key] ?? -1) + 1);
      let pool = allowed.filter((e) => e.muscle === slot.muscle && e.isCompound === slot.compound && !used.has(e.id));
      if (pool.length === 0) pool = allowed.filter((e) => e.muscle === slot.muscle && !used.has(e.id));
      if (pool.length === 0) continue;
      const ex = pool[(variant + k) % pool.length];
      used.add(ex.id);
      picks.push({
        exerciseId: ex.id,
        muscle: ex.muscle,
        order: picks.length + 1,
        sets: baseSets(ex.isCompound, pref.experience),
        ...reps(ex.isCompound, pref.experience),
        targetRpe: WEEK_RPE[0],
        restSec: ex.isCompound ? 150 : 75,
      });
    }
    return { focus, exercises: picks };
  });

  balanceVolume(days, pref.experience);
  return days;
}

export function setsPerMuscle(days: { exercises: GeneratedExercise[] }[]) {
  const out: Record<string, number> = {};
  for (const d of days) for (const e of d.exercises) out[e.muscle] = (out[e.muscle] ?? 0) + e.sets;
  return out;
}

/** Nudge weekly sets for major muscles into the experience range, one set at a time. */
function balanceVolume(days: TemplateDay[], exp: Experience) {
  const range = VOLUME_RANGE[exp];
  for (const muscle of MAJOR_MUSCLES) {
    const exs = days.flatMap((d) => d.exercises.filter((e) => e.muscle === muscle));
    if (exs.length === 0) continue;
    let total = exs.reduce((a, e) => a + e.sets, 0);
    let i = 0;
    while (total < range.min && exs.some((e) => e.sets < MAX_SETS)) {
      const e = exs[i++ % exs.length];
      if (e.sets < MAX_SETS) { e.sets++; total++; }
    }
    while (total > range.max && exs.some((e) => e.sets > MIN_SETS)) {
      const e = exs[i++ % exs.length];
      if (e.sets > MIN_SETS) { e.sets--; total--; }
    }
  }
}

/** 4-week block: weeks 1-3 ramp RPE 7 -> 8, week 4 deloads (~60% sets, RPE 6). */
export function generateProgram(pref: TrainingPrefInput, library: LibraryExercise[], startDay: string): GeneratedDay[] {
  const template = buildWeekTemplate(pref, library);
  const weekdays = new Set(pref.weekdays);
  const out: GeneratedDay[] = [];

  for (let w = 0; w < 4; w++) {
    let idx = 0;
    for (let d = 0; d < 7; d++) {
      const day = addDays(startDay, w * 7 + d);
      if (!weekdays.has(weekdayOf(day)) || idx >= template.length) continue;
      const t = template[idx++];
      const deload = w === 3;
      out.push({
        weekNumber: w + 1,
        day,
        focus: t.focus,
        isDeload: deload,
        exercises: t.exercises.map((e) => ({
          ...e,
          sets: deload ? Math.max(MIN_SETS, Math.round(e.sets * 0.6)) : e.sets,
          targetRpe: WEEK_RPE[w],
        })),
      });
    }
  }
  return out;
}
