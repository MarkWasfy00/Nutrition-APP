"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actingAthlete } from "@/lib/auth/guards";
import { needsConsent } from "@/lib/team";
import { createPlan } from "@/lib/plan/service";
import { SCAN_RANGES, type ScanField } from "@/lib/inbody";
import type { FormState } from "./auth";

/** `fields` lists the inputs that failed, so the form can point at them. */
export type ScanState = (FormState & { fields?: ScanField[] }) | undefined;

const opt = ([min, max]: readonly [number, number]) => z.union([z.literal(""), z.coerce.number().min(min).max(max)]).optional()
  .transform((v) => (v === "" || v == null ? null : v));

const scanSchema = z.object({
  source: z.enum(["IMAGE", "MANUAL"]),
  imageUrl: z.string().optional(),
  weightKg: z.coerce.number().min(SCAN_RANGES.weightKg[0]).max(SCAN_RANGES.weightKg[1]),
  skeletalMuscleMassKg: opt(SCAN_RANGES.skeletalMuscleMassKg),
  bodyFatMassKg: opt(SCAN_RANGES.bodyFatMassKg),
  bodyFatPct: opt(SCAN_RANGES.bodyFatPct),
  fatFreeMassKg: opt(SCAN_RANGES.fatFreeMassKg),
  bmrKcal: opt(SCAN_RANGES.bmrKcal),
  totalBodyWaterL: opt(SCAN_RANGES.totalBodyWaterL),
  visceralFatLevel: opt(SCAN_RANGES.visceralFatLevel),
  purpose: z.enum(["plan", "checkin"]).default("plan"),
});

/**
 * Saves a reviewed/confirmed scan. purpose=plan builds a new 4-week plan.
 * A coach can save a scan for an athlete in their team (hidden `athleteId`), which always builds a plan.
 */
export async function saveScan(_: ScanState, form: FormData): Promise<ScanState> {
  const athleteField = form.get("athleteId");
  const { actor, athlete } = await actingAthlete(typeof athleteField === "string" && athleteField ? athleteField : null);
  const byCoach = actor.id !== athlete.id;
  const parsed = scanSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path[0]).filter((k): k is ScanField => typeof k === "string" && k in SCAN_RANGES);
    return { error: "invalid", fields: [...new Set(fields)] };
  }
  const { purpose, imageUrl, ...data } = parsed.data;
  if (imageUrl && !imageUrl.startsWith(`/api/uploads/${athlete.id}/`)) return { error: "invalid" };
  if (data.bodyFatMassKg != null && data.bodyFatMassKg >= data.weightKg) return { error: "fatMassTooHigh", fields: ["bodyFatMassKg"] };
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
