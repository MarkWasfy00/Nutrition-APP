"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { actionCoach, actionPaidUser, actionUser, managedAthlete } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { canTakeAttendance, sessionSchema } from "@/lib/schedule";
import type { FormState } from "./auth";

const listPath = (user: Pick<User, "role" | "locale">) => `/${user.locale}/${user.role === "COACH" ? "coach/schedule" : "schedule"}`;

/** Coach: any athlete-facing user in a team. Athlete: must pass the paid-app checks. */
async function scheduleUser() {
  const user = await actionUser();
  if (user.role === "COACH") return (await actionCoach());
  return (await actionPaidUser()) as User & { teamId: string };
}

/**
 * A session the user may change: coaches any session of their team; athletes only sessions they
 * created themselves that have no attendance recorded yet.
 */
async function editableSession(user: User & { teamId: string }, sessionId: string) {
  const session = await db.teamSession.findFirst({
    where: { id: sessionId, teamId: user.teamId },
    include: { _count: { select: { attendance: true } } },
  });
  if (!session) throw new Error("NOT_FOUND");
  if (user.role !== "COACH" && (session.createdById !== user.id || session.athleteId !== user.id || session._count.attendance > 0)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/** Creates (sessionId = null) or updates a session. */
export async function saveSession(sessionId: string | null, _: FormState, form: FormData): Promise<FormState> {
  const user = await scheduleUser();
  const existing = sessionId ? await editableSession(user, sessionId) : null;
  const parsed = sessionSchema(today(), existing?.day).safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { error: parsed.error.issues.some((i) => i.path[0] === "day" && i.message === "range") ? "dayRange" : "invalid" };
  }
  const { athleteId: requested, ...data } = parsed.data;

  let athleteId: string | null = user.id;
  if (user.role === "COACH") {
    athleteId = requested;
    if (athleteId && !(await managedAthlete(user, athleteId))) return { error: "invalid" };
  }

  if (existing) {
    await db.teamSession.update({ where: { id: existing.id }, data: { ...data, athleteId } });
  } else {
    await db.teamSession.create({ data: { ...data, athleteId, teamId: user.teamId, createdById: user.id } });
  }
  revalidatePath("/", "layout");
  redirect(`${listPath(user)}?saved=1`);
}

export async function deleteSession(sessionId: string) {
  const user = await scheduleUser();
  const session = await editableSession(user, sessionId);
  await db.teamSession.delete({ where: { id: session.id } });
  revalidatePath("/", "layout");
  redirect(`${listPath(user)}?deleted=1`);
}

/**
 * Coach records attendance. Form fields `a:<athleteId>` = PRESENT | ABSENT | "" (not marked).
 * Only athletes expected at the session (the whole team, or the one athlete) can be marked.
 */
export async function saveAttendance(sessionId: string, _: FormState, form: FormData): Promise<FormState> {
  const coach = await actionCoach();
  const session = await db.teamSession.findFirst({ where: { id: sessionId, teamId: coach.teamId } });
  if (!session) throw new Error("NOT_FOUND");
  if (!canTakeAttendance(session, today())) return { error: "tooEarly" };

  const expected = session.athleteId
    ? [session.athleteId]
    : (await db.user.findMany({ where: { teamId: coach.teamId, role: "ATHLETE" }, select: { id: true } })).map((a) => a.id);
  const marks = expected.map((id) => ({ id, value: form.get(`a:${id}`) }));
  if (marks.some((m) => m.value != null && m.value !== "" && m.value !== "PRESENT" && m.value !== "ABSENT")) return { error: "invalid" };

  await db.$transaction(
    marks.map(({ id, value }) =>
      value === "PRESENT" || value === "ABSENT"
        ? db.attendance.upsert({
            where: { sessionId_athleteId: { sessionId: session.id, athleteId: id } },
            create: { sessionId: session.id, athleteId: id, status: value, markedById: coach.id },
            update: { status: value, markedById: coach.id },
          })
        : db.attendance.deleteMany({ where: { sessionId: session.id, athleteId: id } }),
    ),
  );
  revalidatePath("/", "layout");
  return { ok: true };
}
