"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { actionPaidUser } from "@/lib/auth/guards";
import { CheckInError, submitCheckIn } from "@/lib/plan/checkin";
import type { FormState } from "./auth";

const score = z.coerce.number().int().min(1).max(10);
const schema = z.object({
  bodyWeightKg: z.coerce.number().min(30).max(250),
  scanId: z.string().optional(),
  adherence: score, energy: score, hunger: score, sleep: score, performance: score,
  notes: z.string().max(1000).optional(),
});

export async function checkIn(_: FormState, form: FormData): Promise<FormState> {
  const user = await actionPaidUser();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid" };
  try {
    await submitCheckIn(user.id, { ...parsed.data, scanId: parsed.data.scanId || null });
  } catch (e) {
    if (e instanceof CheckInError) return { error: e.message };
    throw e;
  }
  redirect(`/${user.locale}/checkin?done=1`);
}
