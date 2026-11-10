import type { ExerciseMeasure } from "@prisma/client";

const range = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);

/** "4 × 3–5", "3 × 20–30 s", "6 × 20 m" */
export function prescription(ex: { measure: ExerciseMeasure; sets: number; repMin: number; repMax: number; distanceM: number | null }) {
  if (ex.measure === "DISTANCE") return `${ex.sets} × ${ex.distanceM ?? 20} m`;
  if (ex.measure === "TIME") return `${ex.sets} × ${range(ex.repMin, ex.repMax)} s`;
  return `${ex.sets} × ${range(ex.repMin, ex.repMax)}`;
}
