"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionCoach, managedAthlete } from "@/lib/auth/guards";
import { generatedSession } from "@/lib/plan/service";
import { weekdayOf } from "@/lib/dates";
import { EXERCISES } from "@/lib/training/library";
import { asDeload, editedExerciseSchema, firstInvalidRow, MAX_EXERCISES, type EditedExercise } from "@/lib/training/edit";

/** `row` is the 0-based index of the exercise that failed validation, so the editor can point at it. */
export type SessionEditState = { error?: string; row?: number } | undefined;

const MEASURE = new Map(EXERCISES.map((e) => [e.id, e.measure]));

const payloadSchema = z.object({
  exercises: z.array(editedExerciseSchema).min(1).max(MAX_EXERCISES),
  applyForward: z.boolean().default(false),
});

/** A session in the athlete's active plan, if the athlete is in the signed-in coach's team. */
async function coachedSession(athleteId: string, dayId: string) {
  const coach = await actionCoach();
  const athlete = await managedAthlete(coach, athleteId);
  if (!athlete) throw new Error("NOT_FOUND");
  const day = await db.programDay.findFirst({
    where: { id: dayId, program: { plan: { userId: athlete.id, status: "ACTIVE" } } },
    include: { workouts: { select: { id: true, finishedAt: true } } },
  });
  if (!day) throw new Error("NOT_FOUND");
  return { coach, athlete, day, finished: day.workouts.some((w) => w.finishedAt) };
}

const exerciseRows = (rows: EditedExercise[]) =>
  rows.map((r, i) => ({ ...r, order: i + 1, distanceM: MEASURE.get(r.exerciseId) === "DISTANCE" ? r.distanceM : null }));

const backToWeek = (locale: string, athleteId: string, week: number, flag: string) =>
  `/${locale}/coach/athletes/${athleteId}/training?week=${week}&${flag}=1`;

/**
 * Saves a coach's version of one S&C session. With `applyForward`, the same exercises replace the
 * matching session (same weekday and focus) in later weeks that the athlete hasn't started; deload
 * weeks get fewer sets and lower effort.
 */
export async function saveSession(athleteId: string, dayId: string, _: SessionEditState, form: FormData): Promise<SessionEditState> {
  const { coach, day, finished } = await coachedSession(athleteId, dayId);
  if (finished) return { error: "logged" };

  let raw: unknown;
  try {
    raw = { exercises: JSON.parse(String(form.get("exercises") ?? "[]")), applyForward: form.get("applyForward") === "on" };
  } catch {
    return { error: "invalid" };
  }
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    const row = parsed.error.issues.find((i) => i.path[0] === "exercises" && typeof i.path[1] === "number")?.path[1] as number | undefined;
    return { error: "invalid", row };
  }
  const { exercises, applyForward } = parsed.data;
  const bad = firstInvalidRow(exercises, (id) => MEASURE.get(id));
  if (bad >= 0) return { error: "invalid", row: bad };

  const rows = exerciseRows(exercises);
  const later = applyForward
    ? (await db.programDay.findMany({
        where: { programId: day.programId, day: { gt: day.day }, focus: day.focus, workouts: { none: {} } },
        select: { id: true, day: true, isDeload: true },
      })).filter((d) => weekdayOf(d.day) === weekdayOf(day.day))
    : [];
  const now = new Date();

  await db.$transaction(async (tx) => {
    for (const target of [{ id: day.id, isDeload: false }, ...later]) {
      const copy = target.id !== day.id && target.isDeload && !day.isDeload ? rows.map(asDeload) : rows;
      await tx.programExercise.deleteMany({ where: { dayId: target.id } });
      await tx.programExercise.createMany({ data: copy.map((r) => ({ ...r, dayId: target.id })) });
      await tx.programDay.update({ where: { id: target.id }, data: { editedAt: now } });
    }
  });
  revalidatePath("/", "layout");
  redirect(backToWeek(coach.locale, athleteId, day.weekNumber, "saved"));
}

/** Puts back the generated session for that day (current season phase and match days). */
export async function resetSession(athleteId: string, dayId: string) {
  const { coach, athlete, day, finished } = await coachedSession(athleteId, dayId);
  if (finished) throw new Error("LOGGED");
  const fresh = await generatedSession(athlete.id, day.day);
  // No generated session on this day any more, and the athlete already started it: keep it as is.
  if (!fresh && day.workouts.length > 0) throw new Error("LOGGED");
  await db.$transaction(async (tx) => {
    await tx.programExercise.deleteMany({ where: { dayId: day.id } });
    if (fresh) {
      await tx.programExercise.createMany({
        data: fresh.exercises.map((e) => ({
          dayId: day.id, exerciseId: e.exerciseId, order: e.order, sets: e.sets, repMin: e.repMin,
          repMax: e.repMax, targetRpe: e.targetRpe, restSec: e.restSec, distanceM: e.distanceM,
        })),
      });
      await tx.programDay.update({ where: { id: day.id }, data: { focus: fresh.focus, isDeload: fresh.isDeload, editedAt: null } });
    } else {
      // The schedule no longer has a session on this day.
      await tx.programDay.delete({ where: { id: day.id } });
    }
  });
  revalidatePath("/", "layout");
  redirect(backToWeek(coach.locale, athleteId, day.weekNumber, "reset"));
}

/** Removes a session the athlete hasn't started. */
export async function removeSession(athleteId: string, dayId: string) {
  const { coach, day } = await coachedSession(athleteId, dayId);
  if (day.workouts.length > 0) throw new Error("LOGGED");
  await db.programDay.delete({ where: { id: day.id } });
  revalidatePath("/", "layout");
  redirect(backToWeek(coach.locale, athleteId, day.weekNumber, "removed"));
}
