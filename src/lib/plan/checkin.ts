import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { db } from "../db";
import { applyAdjustment, decideAdjustment } from "../nutrition/adjust";
import { allowedSupplements } from "../nutrition/supplements";
import { groceryList, scaleDay } from "../nutrition/meals";
import type { Macros } from "../nutrition/types";
import { trainingAdherence } from "../training/progress";
import { generateWeekMealsAI, writeFollowUpAI } from "../ai/gemini";
import { asDays, asMacros, dueCheckInWeek, getActivePlan, weekDays } from "./service";

export type CheckInInput = {
  bodyWeightKg: number;
  scanId?: string | null;
  adherence: number;
  energy: number;
  hunger: number;
  sleep: number;
  performance: number;
  notes?: string | null;
};

export class CheckInError extends Error {}

export async function submitCheckIn(userId: string, input: CheckInInput) {
  const plan = await getActivePlan(userId);
  if (!plan) throw new CheckInError("NO_PLAN");
  const [user, profile, pref, previous] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.athleteProfile.findUniqueOrThrow({ where: { userId } }),
    db.trainingPreference.findUniqueOrThrow({ where: { userId } }),
    db.checkIn.findMany({ where: { planId: plan.id }, orderBy: { weekNumber: "asc" } }),
  ]);
  const weekNumber = dueCheckInWeek(plan.startDay, previous.map((c) => c.weekNumber));
  if (!weekNumber) throw new CheckInError("NOT_DUE");

  let currentWeight = input.bodyWeightKg;
  if (input.scanId) {
    const scan = await db.inBodyScan.findFirst({ where: { id: input.scanId, userId } });
    if (scan) currentWeight = scan.weightKg;
  }
  const previousWeight = previous.at(-1)?.bodyWeightKg ?? plan.scan.weightKg;
  const adjustment = decideAdjustment({ goal: plan.goal, previousWeightKg: previousWeight, currentWeightKg: currentWeight, adherence: input.adherence });

  const [planned, done] = await Promise.all([
    db.programDay.count({ where: { program: { planId: plan.id }, weekNumber } }),
    db.workoutLog.count({ where: { userId, finishedAt: { not: null }, programDay: { program: { planId: plan.id }, weekNumber } } }),
  ]);
  const tAdherence = trainingAdherence(done, planned);

  const current = plan.weeks.find((w) => w.weekNumber === weekNumber)!;
  const newTargets = {
    TRAINING: applyAdjustment(asMacros(current.training), adjustment.kcalDelta, currentWeight),
    REST: applyAdjustment(asMacros(current.rest), adjustment.kcalDelta, currentWeight),
  };

  // Next week always gets freshly written meals (new variety, new targets);
  // later weeks are only rescaled when targets changed (they're rewritten at their own check-in).
  const updates: { weekNumber: number; training: Macros; rest: Macros; days: unknown; groceryList: unknown }[] = [];
  for (const w of plan.weeks.filter((w) => w.weekNumber > weekNumber && (w.weekNumber === weekNumber + 1 || adjustment.kcalDelta !== 0))) {
    const days = w.weekNumber === weekNumber + 1
      ? await generateWeekMealsAI({
          days: weekDays(plan.startDay, w.weekNumber, pref.weekdays),
          targets: newTargets,
          mealsPerDay: profile.mealsPerDay,
          allergies: profile.allergies,
          dietaryPrefs: profile.dietaryPrefs,
          supplements: allowedSupplements(profile),
          locale: user.locale,
          weekNumber: w.weekNumber,
          sport: profile.sport,
          goal: plan.goal,
        })
      : asDays(w.days).map((d) => scaleDay(d, newTargets[d.type]));
    updates.push({ weekNumber: w.weekNumber, training: newTargets.TRAINING, rest: newTargets.REST, days, groceryList: groceryList(days) });
  }

  const followUp =
    (await writeFollowUpAI({
      locale: user.locale, name: user.name, goal: plan.goal, weekNumber, adjustment, adherence: input.adherence,
      trainingAdherence: tAdherence, energy: input.energy, hunger: input.hunger, sleep: input.sleep,
      performance: input.performance, notes: input.notes, newTraining: newTargets.TRAINING, newRest: newTargets.REST,
    })) ?? (await templateFollowUp(user.locale, adjustment.reason, adjustment.kcalDelta, tAdherence, weekNumber));

  return db.$transaction(async (tx) => {
    for (const u of updates) {
      await tx.planWeek.update({
        where: { planId_weekNumber: { planId: plan.id, weekNumber: u.weekNumber } },
        data: {
          training: u.training, rest: u.rest,
          days: u.days as Prisma.InputJsonValue, groceryList: u.groceryList as Prisma.InputJsonValue,
        },
      });
    }
    if (weekNumber === 4) await tx.nutritionPlan.update({ where: { id: plan.id }, data: { status: "COMPLETED" } });
    return tx.checkIn.create({
      data: {
        userId, planId: plan.id, weekNumber, bodyWeightKg: currentWeight, scanId: input.scanId ?? null,
        adherence: input.adherence, energy: input.energy, hunger: input.hunger, sleep: input.sleep,
        performance: input.performance, notes: input.notes ?? null, trainingAdherence: tAdherence,
        adjustment: { ...adjustment, newTraining: newTargets.TRAINING, newRest: newTargets.REST } as unknown as Prisma.InputJsonValue,
        followUp,
      },
    });
  });
}

async function templateFollowUp(locale: string, reason: string, kcalDelta: number, tAdherence: number, week: number) {
  const t = await getTranslations({ locale, namespace: "followup" });
  const parts = [t(reason, { delta: Math.abs(kcalDelta) }), t("training", { pct: Math.round(tAdherence * 100) })];
  if (week === 4) parts.push(t("newBlock"));
  return parts.join(" ");
}
