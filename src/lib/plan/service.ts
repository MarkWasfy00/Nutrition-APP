import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { addDays, diffDays, planWeekOf, today, weekdayOf } from "../dates";
import { ageFrom, calculateTargets } from "../nutrition/calc";
import { allowedSupplements } from "../nutrition/supplements";
import { buildWeekMeals, groceryList } from "../nutrition/meals";
import type { DayType, Macros, PlanDay } from "../nutrition/types";
import { generateWeekMealsAI } from "../ai/gemini";
import { generateProgram } from "../training/generate";

export const PLAN_DAYS = 28;

export function getActivePlan(userId: string) {
  return db.nutritionPlan.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { weeks: { orderBy: { weekNumber: "asc" } }, scan: true },
  });
}

export function weekDays(startDay: string, weekNumber: number, trainingWeekdays: number[]) {
  const set = new Set(trainingWeekdays);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(startDay, (weekNumber - 1) * 7 + i);
    return { day, type: (set.has(weekdayOf(day)) ? "TRAINING" : "REST") as DayType };
  });
}

export function deriveBodyComp(scan: { weightKg: number; fatFreeMassKg: number | null; bodyFatMassKg: number | null; bodyFatPct: number | null }) {
  const ffm = scan.fatFreeMassKg ?? (scan.bodyFatMassKg != null ? scan.weightKg - scan.bodyFatMassKg : null);
  const bf = scan.bodyFatPct ?? (scan.bodyFatMassKg != null ? (scan.bodyFatMassKg / scan.weightKg) * 100 : null);
  return { ffm, bf };
}

/** Builds a 4-week nutrition plan + matching training program from a confirmed scan. */
export async function createPlan(userId: string, scanId: string) {
  const [user, profile, pref, scan, exercises] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.athleteProfile.findUniqueOrThrow({ where: { userId } }),
    db.trainingPreference.findUniqueOrThrow({ where: { userId } }),
    db.inBodyScan.findFirstOrThrow({ where: { id: scanId, userId } }),
    db.exercise.findMany(),
  ]);

  const { ffm, bf } = deriveBodyComp(scan);
  const targets = calculateTargets({
    weightKg: scan.weightKg,
    heightCm: profile.heightCm,
    ageYears: ageFrom(profile.birthDate),
    sex: profile.sex,
    fatFreeMassKg: ffm,
    bodyFatPct: bf,
    goal: profile.goal,
    trainingDaysPerWeek: pref.weekdays.length,
    intensity: profile.intensity,
    sport: profile.sport,
  });

  const startDay = today();
  const byType: Record<DayType, Macros> = { TRAINING: targets.training, REST: targets.rest };
  // AI writes week 1 now (keeps plan creation fast and within free-tier rate limits);
  // each later week is rewritten by AI at the check-in before it.
  const weeks = await Promise.all(
    [1, 2, 3, 4].map(async (weekNumber) => {
      const mealOpts = {
        days: weekDays(startDay, weekNumber, pref.weekdays),
        targets: byType,
        mealsPerDay: profile.mealsPerDay,
        allergies: profile.allergies,
        dietaryPrefs: profile.dietaryPrefs,
        supplements: allowedSupplements(profile),
        locale: user.locale,
        weekNumber,
        sport: profile.sport,
        goal: profile.goal,
      };
      const days = weekNumber === 1 ? await generateWeekMealsAI(mealOpts) : buildWeekMeals(mealOpts);
      return { weekNumber, days };
    }),
  );
  const program = generateProgram(pref, exercises, startDay);

  return db.$transaction(
    async (tx) => {
      await tx.nutritionPlan.updateMany({ where: { userId, status: "ACTIVE" }, data: { status: "COMPLETED" } });
      return tx.nutritionPlan.create({
        data: {
          userId,
          scanId,
          goal: profile.goal,
          startDay,
          endDay: addDays(startDay, PLAN_DAYS - 1),
          training: targets.training,
          rest: targets.rest,
          weeks: {
            create: weeks.map((w) => ({
              weekNumber: w.weekNumber,
              training: targets.training,
              rest: targets.rest,
              days: w.days as unknown as Prisma.InputJsonValue,
              groceryList: groceryList(w.days) as unknown as Prisma.InputJsonValue,
            })),
          },
          program: {
            create: {
              split: pref.split,
              days: {
                create: program.map((d) => ({
                  weekNumber: d.weekNumber,
                  day: d.day,
                  focus: d.focus,
                  isDeload: d.isDeload,
                  exercises: {
                    create: d.exercises.map((e) => ({
                      exerciseId: e.exerciseId, order: e.order, sets: e.sets, repMin: e.repMin,
                      repMax: e.repMax, targetRpe: e.targetRpe, restSec: e.restSec,
                    })),
                  },
                })),
              },
            },
          },
        },
      });
    },
    { timeout: 30_000 },
  );
}

/** First week without a check-in, if its 7th day has arrived. */
export function dueCheckInWeek(startDay: string, doneWeeks: number[], day = today()): number | null {
  const elapsed = diffDays(startDay, day) + 1;
  for (let n = 1; n <= 4; n++) {
    if (doneWeeks.includes(n)) continue;
    return elapsed >= n * 7 ? n : null;
  }
  return null;
}

export function nextCheckInDay(startDay: string, doneWeeks: number[]) {
  for (let n = 1; n <= 4; n++) if (!doneWeeks.includes(n)) return { week: n, day: addDays(startDay, n * 7 - 1) };
  return null;
}

export const asMacros = (v: Prisma.JsonValue) => v as unknown as Macros;
export const asDays = (v: Prisma.JsonValue) => v as unknown as PlanDay[];

/** Regenerates meals for the current and later weeks (same targets), e.g. after supplement choices change. */
export async function rebuildUpcomingMeals(userId: string) {
  const plan = await getActivePlan(userId);
  if (!plan) return 0;
  const [user, profile, pref] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.athleteProfile.findUniqueOrThrow({ where: { userId } }),
    db.trainingPreference.findUniqueOrThrow({ where: { userId } }),
  ]);
  const fromWeek = planWeekOf(plan.startDay, today()) ?? 1;
  const weeks = plan.weeks.filter((w) => w.weekNumber >= fromWeek);
  const rebuilt = await Promise.all(
    weeks.map(async (w, i) => ({
      weekNumber: w.weekNumber,
      days: await (i === 0 ? generateWeekMealsAI : async (o: Parameters<typeof buildWeekMeals>[0]) => buildWeekMeals(o))({
        days: weekDays(plan.startDay, w.weekNumber, pref.weekdays),
        targets: { TRAINING: asMacros(w.training), REST: asMacros(w.rest) },
        mealsPerDay: profile.mealsPerDay,
        allergies: profile.allergies,
        dietaryPrefs: profile.dietaryPrefs,
        supplements: allowedSupplements(profile),
        locale: user.locale,
        weekNumber: w.weekNumber,
        sport: profile.sport,
        goal: plan.goal,
      }),
    })),
  );
  await db.$transaction(
    rebuilt.map((w) =>
      db.planWeek.update({
        where: { planId_weekNumber: { planId: plan.id, weekNumber: w.weekNumber } },
        data: {
          days: w.days as unknown as Prisma.InputJsonValue,
          groceryList: groceryList(w.days) as unknown as Prisma.InputJsonValue,
        },
      }),
    ),
  );
  return rebuilt.length;
}
