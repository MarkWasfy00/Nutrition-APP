import type { ExerciseMeasure } from "@prisma/client";
import { z } from "zod";

/** Limits for a coach-edited exercise. Shared by the editor (input limits) and the save action. */
export const EDIT_LIMITS = {
  sets: [1, 10],
  reps: [1, 100],
  seconds: [5, 600],
  distanceM: [5, 2000],
  targetRpe: [5, 10],
  restSec: [0, 600],
} as const;

export const MAX_EXERCISES = 15;

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const editedExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: int(...EDIT_LIMITS.sets),
  repMin: int(1, EDIT_LIMITS.seconds[1]),
  repMax: int(1, EDIT_LIMITS.seconds[1]),
  distanceM: z.union([z.literal(""), z.null(), int(...EDIT_LIMITS.distanceM)]).optional().transform((v) => (v === "" || v == null ? null : v)),
  targetRpe: z.coerce.number().min(EDIT_LIMITS.targetRpe[0]).max(EDIT_LIMITS.targetRpe[1]),
  restSec: int(...EDIT_LIMITS.restSec),
});

export type EditedExercise = z.infer<typeof editedExerciseSchema>;

/** Per-measure checks the schema can't do alone. Returns the index of the first bad row, or -1. */
export function firstInvalidRow(rows: EditedExercise[], measureOf: (id: string) => ExerciseMeasure | undefined) {
  return rows.findIndex((r) => {
    const m = measureOf(r.exerciseId);
    if (!m) return true;
    if (r.repMin > r.repMax) return true;
    const [lo, hi] = m === "TIME" ? EDIT_LIMITS.seconds : EDIT_LIMITS.reps;
    if (r.repMin < lo || r.repMax > hi) return true;
    return m === "DISTANCE" && r.distanceM == null;
  });
}

/** Sensible defaults when a coach switches a row to an exercise with a different measure. */
export function defaultsFor(measure: ExerciseMeasure) {
  if (measure === "TIME") return { repMin: 20, repMax: 30, distanceM: null };
  if (measure === "DISTANCE") return { repMin: 1, repMax: 1, distanceM: 20 };
  return { repMin: 6, repMax: 8, distanceM: null };
}

/** The same session copied into a deload week: ~60% of the sets (never more than given) and RPE 6 at most. */
export function asDeload<T extends { sets: number; targetRpe: number }>(e: T): T {
  return { ...e, sets: Math.min(e.sets, Math.max(2, Math.round(e.sets * 0.6))), targetRpe: Math.min(6, e.targetRpe) };
}
