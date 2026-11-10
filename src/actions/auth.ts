"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { actionUser } from "@/lib/auth/guards";
import { SPORT_IDS } from "@/lib/sports";
import { hasFreeSeat, newInviteCode } from "@/lib/team";
import { paymentsDisabled } from "@/lib/subscription";

export type FormState = { error?: string; ok?: boolean } | undefined;

const account = {
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  agree: z.literal("on"),
  locale: z.string(),
};

const clubSchema = z.object({
  ...account,
  teamName: z.string().trim().min(2).max(80),
  sport: z.enum(SPORT_IDS),
});

const joinSchema = z.object({ ...account, code: z.string().trim().toUpperCase().min(4).max(16) });

function accountError(issues: z.ZodIssue[]) {
  const field = issues[0]?.path[0];
  return field === "agree" ? "mustAgree" : field === "password" ? "passwordShort" : "invalid";
}

/** Creates a team (club squad) and its first coach account. */
export async function registerClub(_: FormState, form: FormData): Promise<FormState> {
  const parsed = clubSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: accountError(parsed.error.issues) };
  const { name, email, password, locale, teamName, sport } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "emailTaken" };
  const passwordHash = await bcrypt.hash(password, 12);
  await db.team.create({
    data: {
      name: teamName, sport, inviteCode: newInviteCode(),
      members: { create: { name, email, passwordHash, locale, role: "COACH" } },
    },
  });
  await signIn("credentials", { email, password, redirectTo: `/${locale}/coach` });
}

/** Seat check shared by sign-up and joining with an existing account. */
async function teamForCode(code: string) {
  const team = await db.team.findUnique({ where: { inviteCode: code.trim().toUpperCase() } });
  if (!team) return { error: "badCode" as const };
  const athletes = await db.user.count({ where: { teamId: team.id, role: "ATHLETE" } });
  if (!hasFreeSeat(team.seats, athletes, paymentsDisabled())) return { error: "teamFull" as const };
  return { team };
}

/** Athlete sign-up through a team invite link. */
export async function joinTeam(_: FormState, form: FormData): Promise<FormState> {
  const parsed = joinSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: accountError(parsed.error.issues) };
  const { name, email, password, locale, code } = parsed.data;
  const found = await teamForCode(code);
  if ("error" in found) return { error: found.error };
  if (await db.user.findUnique({ where: { email } })) return { error: "emailTaken" };
  await db.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), locale, role: "ATHLETE", teamId: found.team.id },
  });
  await signIn("credentials", { email, password, redirectTo: `/${locale}/onboarding` });
}

/** Signed-in athlete without a team (e.g. an account from before teams) enters an invite code. */
export async function joinWithCode(_: FormState, form: FormData): Promise<FormState> {
  const user = await actionUser();
  if (user.role !== "ATHLETE" || user.teamId) return { error: "invalid" };
  const found = await teamForCode(String(form.get("code") || ""));
  if ("error" in found) return { error: found.error };
  await db.user.update({ where: { id: user.id }, data: { teamId: found.team.id } });
  redirect(`/${user.locale}/onboarding`);
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const locale = String(form.get("locale") || "ar-EG");
  const next = String(form.get("next") || "");
  const email = String(form.get("email") || "").toLowerCase();
  // Coaches land on their dashboard; athletes on today's plan.
  const role = (await db.user.findUnique({ where: { email }, select: { role: true } }))?.role;
  const home = role === "COACH" ? `/${locale}/coach` : `/${locale}/today`;
  try {
    await signIn("credentials", {
      email,
      password: String(form.get("password") || ""),
      redirectTo: next.startsWith(`/${locale}/`) ? next : home,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "badCredentials" };
    throw e;
  }
}

export async function logout(locale: string) {
  await signOut({ redirectTo: `/${locale}` });
}
