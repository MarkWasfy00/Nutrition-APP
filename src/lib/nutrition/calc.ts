import type { Goal, Intensity, Sex } from "@prisma/client";
import { kcalFrom, type Macros } from "./types";

export type CalcInput = {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  fatFreeMassKg?: number | null;
  bodyFatPct?: number | null;
  goal: Goal;
  trainingDaysPerWeek: number;
  intensity: Intensity;
  sport?: string;
};

export type CalcResult = {
  bmr: number;
  tdeeTraining: number;
  tdeeRest: number;
  tdeeAvg: number;
  goalAdjustPct: number;
  training: Macros;
  rest: Macros;
};

/** Katch-McArdle when InBody fat-free mass is known, otherwise Mifflin-St Jeor. */
export function bmr(i: Pick<CalcInput, "weightKg" | "heightCm" | "ageYears" | "sex" | "fatFreeMassKg">) {
  if (i.fatFreeMassKg && i.fatFreeMassKg > 0) return 370 + 21.6 * i.fatFreeMassKg;
  return 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.ageYears + (i.sex === "MALE" ? 5 : -161);
}

const REST_FACTOR = 1.3;
const SESSION_ADD: Record<Intensity, number> = { LOW: 0.2, MODERATE: 0.35, HIGH: 0.5, VERY_HIGH: 0.65 };
const ENDURANCE = /run|marath|cycl|swim|tri|row|football|soccer|كورة|جري|سباحة|عجل/i;

export function activityFactors(intensity: Intensity, sport?: string) {
  const enduranceBonus = sport && ENDURANCE.test(sport) ? 0.1 : 0;
  return { rest: REST_FACTOR, training: REST_FACTOR + SESSION_ADD[intensity] + enduranceBonus };
}

/** Percent change applied to the weekly-average TDEE. */
export function goalAdjustPct(goal: Goal, sex: Sex, bodyFatPct?: number | null) {
  switch (goal) {
    case "CUT": {
      const high = sex === "MALE" ? 20 : 28;
      return bodyFatPct != null && bodyFatPct >= high ? -20 : -15;
    }
    case "BULK":
      return 10;
    case "PERFORMANCE":
      return 0; // +5% is added on training days only
    default:
      return 0;
  }
}

const PROTEIN_PER_KG: Record<Goal, number> = { CUT: 2.2, RECOMP: 2.2, MAINTAIN: 2.0, BULK: 1.8, PERFORMANCE: 1.8 };

/** Protein fixed, fat = max(% of kcal, 0.8 g/kg), carbs fill the rest. */
export function splitMacros(kcal: number, weightKg: number, goal: Goal, dayType: "TRAINING" | "REST"): Macros {
  const proteinG = Math.round(PROTEIN_PER_KG[goal] * weightKg);
  const fatPct = dayType === "TRAINING" ? 0.25 : 0.3;
  const fatFloor = 0.8 * weightKg;
  let fatG = Math.max((kcal * fatPct) / 9, fatFloor);
  let carbsG = (kcal - proteinG * 4 - fatG * 9) / 4;
  if (carbsG < 0) {
    fatG = Math.max(fatFloor, fatG + (carbsG * 4) / 9);
    carbsG = Math.max(0, (kcal - proteinG * 4 - fatG * 9) / 4);
  }
  const p = proteinG;
  const c = Math.round(carbsG);
  const f = Math.round(fatG);
  return { kcal: kcalFrom(p, c, f), proteinG: p, carbsG: c, fatG: f };
}

export function calculateTargets(i: CalcInput): CalcResult {
  const base = bmr(i);
  const af = activityFactors(i.intensity, i.sport);
  const days = Math.min(7, Math.max(0, i.trainingDaysPerWeek));
  const tdeeTraining = base * af.training;
  const tdeeRest = base * af.rest;
  const tdeeAvg = (tdeeTraining * days + tdeeRest * (7 - days)) / 7;
  const adj = goalAdjustPct(i.goal, i.sex, i.bodyFatPct);
  const weeklyAvgTarget = tdeeAvg * (1 + adj / 100);

  // Distribute the weekly target proportionally to each day type's expenditure.
  let trainingKcal = weeklyAvgTarget * (tdeeTraining / tdeeAvg);
  const restKcal = weeklyAvgTarget * (tdeeRest / tdeeAvg);
  if (i.goal === "PERFORMANCE") trainingKcal *= 1.05;

  return {
    bmr: Math.round(base),
    tdeeTraining: Math.round(tdeeTraining),
    tdeeRest: Math.round(tdeeRest),
    tdeeAvg: Math.round(tdeeAvg),
    goalAdjustPct: adj,
    training: splitMacros(trainingKcal, i.weightKg, i.goal, "TRAINING"),
    rest: splitMacros(restKcal, i.weightKg, i.goal, "REST"),
  };
}

export function ageFrom(birthDate: Date, now = new Date()) {
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}
