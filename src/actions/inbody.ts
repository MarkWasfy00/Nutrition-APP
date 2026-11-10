"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actingAthlete } from "@/lib/auth/guards";
import { needsConsent } from "@/lib/team";
import { createPlan } from "@/lib/plan/service";
import type { FormState } from "./auth";

const opt = (min: number, max: number) => z.union([z.literal(""), z.coerce.number().min(min).max(max)]).optional()
  .transform((v) => (v === "" || v == null ? null : v));

const scanSchema = z.object({
  source: z.enum(["IMAGE", "MANUAL"]),
  imageUrl: z.string().optional(),
  weightKg: z.coerce.number().min(30).max(250),
  skeletalMuscleMassKg: opt(5, 120),
  bodyFatMassKg: opt(1, 150),
  bodyFatPct: opt(2, 70),
  fatFreeMassKg: opt(20, 150),
  bmrKcal: opt(800, 4000),
  totalBodyWaterL: opt(10, 100),
  visceralFatLevel: opt(1, 30),
  purpose: z.enum(["plan", "checkin"]).default("plan"),
});

/**
 * Saves a reviewed/confirmed scan. purpose=plan builds a new 4-week plan.
 * A coach can save a scan for an athlete in their team (hidden `athleteId`), which always builds a plan.
 */
export async function saveScan(_: FormState, form: FormData): Promise<FormState> {
  const athleteField = form.get("athleteId");
  const { actor, athlete } = await actingAthlete(typeof athleteField === "string" && athleteField ? athleteField : null);
  const byCoach = actor.id !== athlete.id;
  const parsed = scanSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid" };
  const { purpose, imageUrl, ...data } = parsed.data;
  if (imageUrl && !imageUrl.startsWith(`/api/uploads/${athlete.id}/`)) return { error: "invalid" };
  if (data.bodyFatMassKg != null && data.bodyFatMassKg >= data.weightKg) return { error: "invalid" };
  if (byCoach) {
    const profile = await db.athleteProfile.findUnique({ where: { userId: athlete.id } });
    if (!profile) return { error: "noProfile" };
    // A minor's plan only starts once a coach has confirmed guardian consent.
    if (needsConsent(profile.birthDate) && !profile.consentConfirmedAt) return { error: "CONSENT_REQUIRED" };
  }

  const scan = await db.inBodyScan.create({
    data: { ...data, imageUrl: imageUrl || null, userId: athlete.id, confirmed: true },
  });
  if (purpose === "checkin" && !byCoach) redirect(`/${actor.locale}/checkin?scan=${scan.id}`);

  try {
    await createPlan(athlete.id, scan.id);
  } catch (e) {
    console.error("[plan] creation failed", e);
    return { error: "planFailed" };
  }
  redirect(byCoach ? `/${actor.locale}/coach/athletes/${athlete.id}?scan=1` : `/${actor.locale}/plan`);
}
