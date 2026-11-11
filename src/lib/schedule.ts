import type { AttendanceStatus, SessionKind } from "@prisma/client";
import { z } from "zod";
import { addDays } from "./dates";

export const SESSION_KINDS = ["PRACTICE", "MATCH", "SC", "RECOVERY", "OTHER"] as const satisfies readonly SessionKind[];

/** How far back / ahead a session can be dated. */
export const SCHEDULE_WINDOW = { pastDays: 60, futureDays: 365 } as const;

export const DURATION = { min: 15, max: 300, step: 5 } as const;

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

/**
 * Form fields for a session. `athleteId` is only read for coaches ("" = whole team).
 * `keepDay`: an existing session's date, accepted even when it is outside the usual window.
 */
export function sessionSchema(today: string, keepDay?: string) {
  return z.object({
    kind: z.enum(SESSION_KINDS),
    title: optText(80),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((d) => d === keepDay || (d >= addDays(today, -SCHEDULE_WINDOW.pastDays) && d <= addDays(today, SCHEDULE_WINDOW.futureDays)), "range"),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMin: z.coerce.number().int().min(DURATION.min).max(DURATION.max),
    location: optText(80),
    notes: optText(500),
    athleteId: z.string().optional().transform((v) => v || null),
  });
}

/** "18:30" + 90 → "20:00" (wraps past midnight). */
export function endTime(startTime: string, durationMin: number) {
  const [h, m] = startTime.split(":").map(Number);
  const t = (h * 60 + m + durationMin) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Attendance can be taken from the day of the session on. */
export const canTakeAttendance = (session: { day: string }, today: string) => session.day <= today;

/** Sessions an athlete sees: the whole team's plus their own. */
export const athleteSessionsWhere = (athlete: { id: string; teamId: string }) => ({
  teamId: athlete.teamId,
  OR: [{ athleteId: null }, { athleteId: athlete.id }],
});

/** Share of recorded sessions attended, 0-100, or null when nothing is recorded yet. */
export function attendanceRate(records: { status: AttendanceStatus }[]) {
  if (records.length === 0) return null;
  return Math.round((records.filter((r) => r.status === "PRESENT").length / records.length) * 100);
}

/** Counts for one session: who is expected, and how many are marked present / absent. */
export function attendanceSummary(expected: number, records: { status: AttendanceStatus }[]) {
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  return { expected, present, absent, unmarked: Math.max(0, expected - present - absent) };
}
