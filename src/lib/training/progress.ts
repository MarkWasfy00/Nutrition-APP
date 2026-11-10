/** Epley estimated one-rep max. */
export function epley1RM(weightKg: number, reps: number) {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export type SetLike = { weightKg: number; reps: number };

export function bestE1RM(sets: SetLike[]) {
  return sets.reduce((best, s) => Math.max(best, epley1RM(s.weightKg, s.reps)), 0);
}

export function isPR(set: SetLike, history: SetLike[]) {
  const e = epley1RM(set.weightKg, set.reps);
  return e > 0 && e > bestE1RM(history);
}

/** Double progression: hit the top of the rep range on every set -> add load next time. */
export function suggestNext(input: {
  lastSets: SetLike[];
  plannedSets: number;
  repMin: number;
  repMax: number;
  isLowerBody: boolean;
}): { weightKg: number; reps: number; increased: boolean } | null {
  if (input.lastSets.length === 0) return null;
  const topWeight = Math.max(...input.lastSets.map((s) => s.weightKg));
  const working = input.lastSets.filter((s) => s.weightKg === topWeight);
  const allTop = working.length >= input.plannedSets && working.every((s) => s.reps >= input.repMax);
  if (allTop) {
    return { weightKg: topWeight + (input.isLowerBody ? 5 : 2.5), reps: input.repMin, increased: true };
  }
  const minReps = Math.min(...working.map((s) => s.reps));
  return { weightKg: topWeight, reps: Math.min(input.repMax, Math.max(input.repMin, minReps + 1)), increased: false };
}

export function weeklyVolumeByMuscle(sets: (SetLike & { muscle: string })[]) {
  const out: Record<string, { sets: number; tonnage: number }> = {};
  for (const s of sets) {
    out[s.muscle] ??= { sets: 0, tonnage: 0 };
    out[s.muscle].sets += 1;
    out[s.muscle].tonnage += s.reps * s.weightKg;
  }
  return out;
}

export function trainingAdherence(done: number, planned: number) {
  if (planned <= 0) return 1;
  return Math.min(1, Math.round((done / planned) * 100) / 100);
}

/** Rough strength-session burn: MET 5. */
export function estimateWorkoutKcal(bodyWeightKg: number, minutes: number) {
  return Math.round(5 * bodyWeightKg * (minutes / 60));
}
