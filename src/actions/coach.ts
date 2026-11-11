"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionCoach, managedAthlete } from "@/lib/auth/guards";
import { rebuildUpcomingMeals, rebuildUpcomingProgram } from "@/lib/plan/service";
import { newInviteCode } from "@/lib/team";
import { SEASON_PHASES } from "@/lib/training/phases";
import type { FormState } from "./auth";

const days = (form: FormData, key: string) =>
  [...new Set(form.getAll(key).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);

const teamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phase: z.enum(SEASON_PHASES),
});

const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Team name, season phase, practice and match weekdays.
 * Athletes' upcoming S&C sessions are rebuilt around the new schedule, and their meal days
 * (training vs rest) follow practice and match days.
 */
export async function saveTeam(_: FormState, form: FormData): Promise<FormState> {
  const coach = await actionCoach();
  const parsed = teamSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid" };
  const practiceWeekdays = days(form, "practiceWeekdays");
  const matchWeekdays = days(form, "matchWeekdays");
  if (matchWeekdays.length > 3) return { error: "tooManyMatches" };

  const before = await db.team.findUniqueOrThrow({ where: { id: coach.teamId } });
  await db.team.update({ where: { id: coach.teamId }, data: { ...parsed.data, practiceWeekdays, matchWeekdays } });

  const programChanged = before.phase !== parsed.data.phase || !sameDays(before.matchWeekdays, matchWeekdays);
  const daysChanged = !sameDays(before.practiceWeekdays, practiceWeekdays) || !sameDays(before.matchWeekdays, matchWeekdays);
  if (programChanged || daysChanged) {
    const athletes = await db.user.findMany({
      where: { teamId: coach.teamId, role: "ATHLETE", plans: { some: { status: "ACTIVE" } } },
      select: { id: true },
    });
    for (const a of athletes) {
      try {
        if (programChanged) await rebuildUpcomingProgram(a.id);
        // Team-wide rebuild uses the built-in meal builder: running AI for a whole squad would take too long.
        if (daysChanged) await rebuildUpcomingMeals(a.id, { useAI: false });
      } catch (e) {
        console.error("[team] rebuild failed for athlete", a.id, e);
      }
    }
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Coach confirms a guardian has consented for a 16-17 year old athlete. */
export async function confirmConsent(athleteId: string) {
  const coach = await actionCoach();
  const athlete = await managedAthlete(coach, athleteId);
  if (!athlete) throw new Error("NOT_FOUND");
  await db.athleteProfile.updateMany({
    where: { userId: athlete.id, consentConfirmedAt: null },
    data: { consentConfirmedAt: new Date(), consentById: coach.id },
  });
  revalidatePath("/", "layout");
}

/** Removes an athlete from the team (frees a seat). Their account and history are kept. */
export async function removeAthlete(athleteId: string) {
  const coach = await actionCoach();
  const athlete = await managedAthlete(coach, athleteId);
  if (!athlete) throw new Error("NOT_FOUND");
  await db.user.update({ where: { id: athlete.id }, data: { teamId: null } });
  revalidatePath("/", "layout");
  redirect(`/${coach.locale}/coach`);
}

/** New invite code; the old link stops working. */
export async function resetInviteCode() {
  const coach = await actionCoach();
  await db.team.update({ where: { id: coach.teamId }, data: { inviteCode: newInviteCode() } });
  revalidatePath("/", "layout");
}
