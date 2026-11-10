import { dueCheckInWeek } from "./plan/service";
import { planWeekOf, today } from "./dates";
import { needsConsent } from "./team";

export type AthleteStatus =
  | { kind: "ONBOARDING" }
  | { kind: "CONSENT" }
  | { kind: "SCAN" }
  | { kind: "CHECKIN_DUE"; week: number }
  | { kind: "ON_PLAN"; week: number };

/** What a coach needs to know (or do) next for an athlete. */
export function athleteStatus(input: {
  profile: { birthDate: Date; consentConfirmedAt: Date | null } | null;
  plan: { startDay: string; checkInWeeks: number[] } | null;
  day?: string;
}): AthleteStatus {
  const day = input.day ?? today();
  if (!input.profile) return { kind: "ONBOARDING" };
  if (needsConsent(input.profile.birthDate) && !input.profile.consentConfirmedAt) return { kind: "CONSENT" };
  if (!input.plan) return { kind: "SCAN" };
  const due = dueCheckInWeek(input.plan.startDay, input.plan.checkInWeeks, day);
  if (due) return { kind: "CHECKIN_DUE", week: due };
  return { kind: "ON_PLAN", week: planWeekOf(input.plan.startDay, day) ?? 4 };
}

/** Average weekly body-weight change from check-ins (kg / week), or null. */
export function weeklyWeightChange(startWeight: number, checkIns: { weekNumber: number; bodyWeightKg: number }[]) {
  const last = [...checkIns].sort((a, b) => a.weekNumber - b.weekNumber).at(-1);
  if (!last) return null;
  return Math.round(((last.bodyWeightKg - startWeight) / last.weekNumber) * 10) / 10;
}
