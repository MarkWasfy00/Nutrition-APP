import { sumMacros, type Macros } from "./types";

export type DailyStatus = {
  target: Macros;
  eaten: Macros;
  remaining: Macros;
  workoutKcal: number;
};

/** remaining = target (+ optional workout burn) - eaten. Negative values mean "over". */
export function computeDailyStatus(target: Macros, logs: Macros[], workoutKcal = 0, addBackExercise = false): DailyStatus {
  const eaten = sumMacros(logs);
  const extra = addBackExercise ? workoutKcal : 0;
  const t = { ...target, kcal: target.kcal + extra, carbsG: target.carbsG + Math.round(extra / 4) };
  const r = (a: number, b: number) => Math.round(a - b);
  return {
    target: t,
    eaten: { kcal: Math.round(eaten.kcal), proteinG: Math.round(eaten.proteinG), carbsG: Math.round(eaten.carbsG), fatG: Math.round(eaten.fatG) },
    remaining: { kcal: r(t.kcal, eaten.kcal), proteinG: r(t.proteinG, eaten.proteinG), carbsG: r(t.carbsG, eaten.carbsG), fatG: r(t.fatG, eaten.fatG) },
    workoutKcal,
  };
}
