import { db } from "../db";
import { planWeekOf, today } from "../dates";
import { asDays, asMacros, getActivePlan } from "../plan/service";
import { computeDailyStatus } from "./remaining";

export async function getDailyStatus(userId: string, day = today()) {
  const plan = await getActivePlan(userId);
  if (!plan) return null;
  const weekNumber = planWeekOf(plan.startDay, day);
  if (!weekNumber) return { plan, expired: true as const };
  const week = plan.weeks.find((w) => w.weekNumber === weekNumber)!;
  const planDay = asDays(week.days).find((d) => d.day === day) ?? null;
  const type = planDay?.type ?? "REST";
  const target = asMacros(type === "TRAINING" ? week.training : week.rest);

  const [user, logs, workouts] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.foodLog.findMany({ where: { userId, day }, orderBy: { createdAt: "asc" } }),
    db.workoutLog.aggregate({ where: { userId, day }, _sum: { kcalBurned: true } }),
  ]);

  return {
    plan,
    expired: false as const,
    weekNumber,
    type,
    planDay,
    logs,
    ...computeDailyStatus(target, logs, workouts._sum.kcalBurned ?? 0, user.addBackExerciseKcal),
  };
}
