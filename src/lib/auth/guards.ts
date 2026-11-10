import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "../db";
import { teamHasAccess } from "../subscription";
import { needsConsent } from "../team";

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id } });
}

/** Page guard: signed in, else /login. */
export async function requireUser(locale: string) {
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}

/** Where a signed-in user lands. */
export function homePath(user: Pick<User, "role" | "teamId" | "locale">) {
  if (user.role === "COACH") return `/${user.locale}/coach`;
  if (!user.teamId) return `/${user.locale}/no-team`;
  return `/${user.locale}/today`;
}

/** Page guard: coach of a team. */
export async function requireCoach(locale: string) {
  const user = await requireUser(locale);
  if (user.role !== "COACH" || !user.teamId) redirect(homePath(user));
  const team = await db.team.findUniqueOrThrow({ where: { id: user.teamId } });
  return { user, team };
}

/**
 * Page guard for the athlete app: an athlete in a team with an active subscription,
 * onboarded, and (if 16-17) with guardian consent confirmed by a coach.
 */
export async function requirePaidUser(locale: string) {
  const user = await requireUser(locale);
  if (user.role === "COACH") redirect(`/${locale}/coach`);
  if (!user.teamId) redirect(`/${locale}/no-team`);
  const profile = await db.athleteProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect(`/${locale}/onboarding`);
  if (!(await teamHasAccess(user.teamId))) redirect(`/${locale}/waiting?reason=subscription`);
  if (needsConsent(profile.birthDate) && !profile.consentConfirmedAt) redirect(`/${locale}/waiting?reason=consent`);
  return { user, profile };
}

/** Server-action guards (throw instead of redirecting). */
export async function actionUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function actionPaidUser() {
  const user = await actionUser();
  if (user.role !== "ATHLETE") throw new Error("UNAUTHORIZED");
  if (!(await teamHasAccess(user.teamId))) throw new Error("SUBSCRIPTION_REQUIRED");
  const profile = await db.athleteProfile.findUnique({ where: { userId: user.id } });
  if (profile && needsConsent(profile.birthDate) && !profile.consentConfirmedAt) throw new Error("CONSENT_REQUIRED");
  return user;
}

export async function actionCoach() {
  const user = await actionUser();
  if (user.role !== "COACH" || !user.teamId) throw new Error("UNAUTHORIZED");
  return user as User & { teamId: string };
}

/** An athlete in the coach's own team, or null. */
export async function managedAthlete(coach: Pick<User, "role" | "teamId">, athleteId: string) {
  if (coach.role !== "COACH" || !coach.teamId) return null;
  return db.user.findFirst({ where: { id: athleteId, teamId: coach.teamId, role: "ATHLETE" } });
}

/**
 * The athlete a request acts on: the signed-in athlete, or (for a coach) an athlete in their team
 * whose team subscription is active.
 */
export async function actingAthlete(athleteId?: string | null) {
  const user = await actionUser();
  if (user.role === "COACH") {
    if (!athleteId) throw new Error("UNAUTHORIZED");
    const athlete = await managedAthlete(user, athleteId);
    if (!athlete) throw new Error("UNAUTHORIZED");
    if (!(await teamHasAccess(athlete.teamId))) throw new Error("SUBSCRIPTION_REQUIRED");
    return { actor: user, athlete };
  }
  return { actor: user, athlete: await actionPaidUser() };
}
