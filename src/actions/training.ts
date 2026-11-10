"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionPaidUser } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { estimateWorkoutKcal, isPR } from "@/lib/training/progress";

async function ownDay(userId: string, dayId: string) {
  const day = await db.programDay.findFirst({ where: { id: dayId, program: { plan: { userId } } } });
  if (!day) throw new Error("NOT_FOUND");
  return day;
}

export async function startWorkout(programDayId: string) {
  const user = await actionPaidUser();
  const day = await ownDay(user.id, programDayId);
  const existing = await db.workoutLog.findFirst({ where: { userId: user.id, programDayId: day.id } });
  if (existing) return existing.id;
  const w = await db.workoutLog.create({ data: { userId: user.id, programDayId: day.id, day: today() } });
  revalidatePath("/", "layout");
  return w.id;
}

const setSchema = z.object({
  workoutId: z.string(),
  exerciseId: z.string(),
  setNumber: z.number().int().min(1).max(20),
  reps: z.number().int().min(0).max(100),
  weightKg: z.number().min(0).max(1000),
  durationSec: z.number().int().min(1).max(3600).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
});

/** Upserts one set; returns whether it's a personal record (Epley e1RM, loaded lifts only). */
export async function logSet(input: z.input<typeof setSchema>) {
  const user = await actionPaidUser();
  const s = setSchema.parse(input);
  const [workout, exercise] = await Promise.all([
    db.workoutLog.findFirst({ where: { id: s.workoutId, userId: user.id } }),
    db.exercise.findUnique({ where: { id: s.exerciseId }, select: { measure: true } }),
  ]);
  if (!workout || !exercise) throw new Error("NOT_FOUND");

  let pr = false;
  if (exercise.measure === "LOAD_REPS") {
    const history = await db.setLog.findMany({
      where: { exerciseId: s.exerciseId, workout: { userId: user.id }, NOT: { workoutId: s.workoutId, setNumber: s.setNumber } },
      select: { weightKg: true, reps: true },
    });
    pr = isPR(s, history);
  }
  const existing = await db.setLog.findFirst({ where: { workoutId: s.workoutId, exerciseId: s.exerciseId, setNumber: s.setNumber } });
  const data = { reps: s.reps, weightKg: s.weightKg, durationSec: s.durationSec ?? null, rpe: s.rpe ?? null, isPR: pr };
  if (existing) await db.setLog.update({ where: { id: existing.id }, data });
  else await db.setLog.create({ data: { ...data, workoutId: s.workoutId, exerciseId: s.exerciseId, setNumber: s.setNumber } });
  return { isPR: pr };
}

export async function finishWorkout(workoutId: string, notes?: string) {
  const user = await actionPaidUser();
  const workout = await db.workoutLog.findFirst({ where: { id: workoutId, userId: user.id } });
  if (!workout) throw new Error("NOT_FOUND");
  const finishedAt = new Date();
  const durationMin = Math.max(1, Math.round((finishedAt.getTime() - workout.startedAt.getTime()) / 60000));
  const scan = await db.inBodyScan.findFirst({ where: { userId: user.id }, orderBy: { takenAt: "desc" } });
  await db.workoutLog.update({
    where: { id: workoutId },
    data: {
      finishedAt, durationMin: Math.min(durationMin, 180), notes: notes?.slice(0, 500) || null,
      kcalBurned: estimateWorkoutKcal(scan?.weightKg ?? 75, Math.min(durationMin, 180)),
    },
  });
  revalidatePath("/", "layout");
}
