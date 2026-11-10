"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionUser } from "@/lib/auth/guards";
import { ageFrom } from "@/lib/nutrition/calc";
import { routing } from "@/i18n/routing";
import { sanitizeSupplements } from "@/lib/nutrition/supplements";
import { rebuildUpcomingMeals, trainingWeekdays } from "@/lib/plan/service";
import { SPORT_IDS } from "@/lib/sports";
import { MIN_AGE, needsConsent } from "@/lib/team";
import { teamHasAccess } from "@/lib/subscription";
import type { FormState } from "./auth";

const list = (v: FormDataEntryValue[]) => v.map(String).filter(Boolean);

const onboardingSchema = z.object({
  sport: z.enum(SPORT_IDS),
  sex: z.enum(["MALE", "FEMALE"]),
  birthDate: z.coerce.date(),
  heightCm: z.coerce.number().min(120).max(230),
  goal: z.enum(["CUT", "BULK", "RECOMP", "PERFORMANCE", "MAINTAIN"]),
  targetWeightKg: z.union([z.literal(""), z.coerce.number().min(30).max(250)]).optional(),
  intensity: z.enum(["LOW", "MODERATE", "HIGH", "VERY_HIGH"]),
  mealsPerDay: z.coerce.number().int().min(3).max(6),
  experience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  sessionMinutes: z.coerce.number().int().min(30).max(120),
});

/** Strength & conditioning sessions per week (on top of team practice). */
const SC_DAYS = { min: 1, max: 4 } as const;

export async function saveOnboarding(_: FormState, form: FormData): Promise<FormState> {
  const user = await actionUser();
  if (user.role !== "ATHLETE" || !user.teamId) return { error: "invalid" };
  const parsed = onboardingSchema.safeParse(Object.fromEntries(form));
  const weekdays = [...new Set(list(form.getAll("weekdays")).map(Number).filter((d) => d >= 0 && d <= 6))];
  if (!parsed.success) return { error: "invalid" };
  if (weekdays.length < SC_DAYS.min || weekdays.length > SC_DAYS.max) return { error: "weekdays" };
  const d = parsed.data;
  if (ageFrom(d.birthDate) < MIN_AGE) return { error: "tooYoung" };

  const team = await db.team.findUniqueOrThrow({ where: { id: user.teamId } });
  const before = await db.athleteProfile.findUnique({ where: { userId: user.id } });
  const birthChanged = !before || before.birthDate.getTime() !== d.birthDate.getTime();
  const profile = {
    sport: d.sport, sex: d.sex, birthDate: d.birthDate, heightCm: d.heightCm, goal: d.goal,
    targetWeightKg: d.targetWeightKg === "" || d.targetWeightKg == null ? null : d.targetWeightKg,
    intensity: d.intensity, mealsPerDay: d.mealsPerDay,
    trainingDaysPerWeek: trainingWeekdays(team, weekdays).length,
    allergies: list(form.getAll("allergies")), dietaryPrefs: list(form.getAll("dietaryPrefs")),
    ...supplementFields(form),
    // A new birth date of a minor needs the coach to confirm consent again.
    ...(birthChanged ? { consentConfirmedAt: null, consentById: null } : {}),
  };
  const pref = {
    experience: d.experience, sessionMinutes: d.sessionMinutes,
    weekdays: weekdays.sort(), injuries: list(form.getAll("injuries")),
  };
  await db.$transaction([
    db.athleteProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...profile }, update: profile }),
    db.trainingPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, ...pref }, update: pref }),
  ]);
  const hasPlan = await db.nutritionPlan.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
  if (hasPlan && before && supplementsChanged(before, profile)) await rebuildUpcomingMeals(user.id);
  const blocked = (needsConsent(d.birthDate) && (birthChanged || !before?.consentConfirmedAt)) || !(await teamHasAccess(user.teamId));
  redirect(`/${user.locale}/${blocked ? "waiting" : hasPlan ? "settings?saved=1" : "inbody/new"}`);
}

export async function setLocale(locale: string) {
  if (!(routing.locales as readonly string[]).includes(locale)) return;
  const user = await actionUser().catch(() => null);
  if (user) await db.user.update({ where: { id: user.id }, data: { locale } });
}

export async function updateSettings(_: FormState, form: FormData): Promise<FormState> {
  const user = await actionUser();
  const name = String(form.get("name") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  if (name.length < 2) return { error: "invalid" };
  await db.user.update({
    where: { id: user.id },
    data: { name, phone: phone || null, ...(user.role === "ATHLETE" ? { addBackExerciseKcal: form.get("addBackExerciseKcal") === "on" } : {}) },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

function supplementFields(form: FormData) {
  const useSupplements = form.get("useSupplements") === "yes";
  return { useSupplements, supplements: useSupplements ? sanitizeSupplements(list(form.getAll("supplements"))) : [] };
}

function supplementsChanged(a: { useSupplements: boolean; supplements: string[] }, b: { useSupplements: boolean; supplements: string[] }) {
  return a.useSupplements !== b.useSupplements || [...a.supplements].sort().join() !== [...b.supplements].sort().join();
}

/** Settings: change supplements without redoing onboarding; rebuilds this week's and later meals. */
export async function saveSupplements(_: FormState, form: FormData): Promise<FormState> {
  const user = await actionUser();
  const profile = await db.athleteProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return { error: "invalid" };
  const next = supplementFields(form);
  if (next.useSupplements && next.supplements.length === 0) return { error: "pickOne" };
  if (!supplementsChanged(profile, next)) return { ok: true };
  await db.athleteProfile.update({ where: { userId: user.id }, data: next });
  await rebuildUpcomingMeals(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
