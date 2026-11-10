import type { Goal } from "@prisma/client";
import { kcalFrom, type Macros } from "./types";

/** Target body-weight change in % of body weight per week. */
export const TARGET_RATE: Record<Goal, { min: number; max: number }> = {
  CUT: { min: -1.0, max: -0.5 },
  BULK: { min: 0.25, max: 0.5 },
  RECOMP: { min: -0.25, max: 0.25 },
  MAINTAIN: { min: -0.25, max: 0.25 },
  PERFORMANCE: { min: -0.25, max: 0.25 },
};

export type AdjustReason = "LOW_ADHERENCE" | "ON_TRACK" | "TOO_SLOW_OR_GAINING" | "TOO_FAST_OR_LOSING";

export type Adjustment = {
  reason: AdjustReason;
  ratePct: number;
  kcalDelta: number;
  target: { min: number; max: number };
};

export function stepFor(gap: number) {
  const g = Math.abs(gap);
  if (g < 0.25) return 100;
  if (g < 0.75) return 150;
  return 200;
}

export function decideAdjustment(input: {
  goal: Goal;
  previousWeightKg: number;
  currentWeightKg: number;
  adherence: number; // 1-10
}): Adjustment {
  const target = TARGET_RATE[input.goal];
  const ratePct = Math.round(((input.currentWeightKg - input.previousWeightKg) / input.previousWeightKg) * 1000) / 10;

  if (input.adherence < 7) return { reason: "LOW_ADHERENCE", ratePct, kcalDelta: 0, target };
  if (ratePct > target.max) return { reason: "TOO_SLOW_OR_GAINING", ratePct, kcalDelta: -stepFor(ratePct - target.max), target };
  if (ratePct < target.min) return { reason: "TOO_FAST_OR_LOSING", ratePct, kcalDelta: stepFor(target.min - ratePct), target };
  return { reason: "ON_TRACK", ratePct, kcalDelta: 0, target };
}

/** Protein stays; ~70% of the change goes to carbs and ~30% to fat (fat never below 0.8 g/kg). */
export function applyAdjustment(m: Macros, kcalDelta: number, weightKg: number): Macros {
  if (kcalDelta === 0) return m;
  const fatFloor = Math.round(0.8 * weightKg);
  let fatG = Math.max(fatFloor, Math.round(m.fatG + (kcalDelta * 0.3) / 9));
  const fatKcalChange = (fatG - m.fatG) * 9;
  let carbsG = Math.round(m.carbsG + (kcalDelta - fatKcalChange) / 4);
  if (carbsG < 50) {
    carbsG = Math.max(50, Math.min(m.carbsG, carbsG));
    fatG = Math.max(fatFloor, fatG);
  }
  return { proteinG: m.proteinG, carbsG, fatG, kcal: kcalFrom(m.proteinG, carbsG, fatG) };
}
