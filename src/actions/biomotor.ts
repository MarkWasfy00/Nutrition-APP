"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { actionCoach, actionPaidUser, actionUser, managedAthlete } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { assignmentSchema, assignmentTests, canRecord, parseScore, resultField } from "@/lib/biomotor";
import type { FormState } from "./auth";

/** Creates (assignmentId = null) or updates a testing assignment. Coaches only. */
export async function saveAssignment(assignmentId: string | null, _: FormState, form: FormData): Promise<FormState> {
  const coach = await actionCoach();
  const existing = assignmentId ? await db.biomotorAssignment.findFirst({ where: { id: assignmentId, teamId: coach.teamId } }) : null;
  if (assignmentId && !existing) throw new Error("NOT_FOUND");

  const parsed = assignmentSchema(today(), existing?.day).safeParse({ ...Object.fromEntries(form), tests: form.getAll("tests") });
  if (!parsed.success) {
    const issue = parsed.error.issues.find((i) => i.message === "range" || i.message === "tests");
    return { error: issue?.message === "range" ? "dayRange" : issue?.message === "tests" ? "noTests" : "invalid" };
  }
  const data = parsed.data;
  if (data.athleteId && !(await managedAthlete(coach, data.athleteId))) return { error: "invalid" };

  let id: string;
  if (existing) {
    // Results for tests that were removed, or for athletes no longer assigned, go with them.
    await db.$transaction([
      db.biomotorResult.deleteMany({
        where: { assignmentId: existing.id, OR: [{ testId: { notIn: data.tests } }, ...(data.athleteId ? [{ athleteId: { not: data.athleteId } }] : [])] },
      }),
      db.biomotorAssignment.update({ where: { id: existing.id }, data }),
    ]);
    id = existing.id;
  } else {
    id = (await db.biomotorAssignment.create({ data: { ...data, teamId: coach.teamId, createdById: coach.id } })).id;
  }
  revalidatePath("/", "layout");
  redirect(`/${coach.locale}/coach/tests/${id}?saved=1`);
}

export async function deleteAssignment(assignmentId: string) {
  const coach = await actionCoach();
  const { count } = await db.biomotorAssignment.deleteMany({ where: { id: assignmentId, teamId: coach.teamId } });
  if (!count) throw new Error("NOT_FOUND");
  revalidatePath("/", "layout");
  redirect(`/${coach.locale}/coach/tests?deleted=1`);
}

/** Coach: any athlete-facing user in a team. Athlete: must pass the paid-app checks. */
async function resultsUser() {
  const user = await actionUser();
  if (user.role === "COACH") return actionCoach();
  return (await actionPaidUser()) as User & { teamId: string };
}

/**
 * Saves scores. Form fields `r:<athleteId>:<testId>` = a score or "" (clear). Fields left out are not touched.
 * Coaches record for anyone assigned; athletes only for themselves, and never over a score their coach entered.
 */
export async function saveResults(assignmentId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await resultsUser();
  const assignment = await db.biomotorAssignment.findFirst({ where: { id: assignmentId, teamId: user.teamId } });
  if (!assignment) throw new Error("NOT_FOUND");
  if (!canRecord(assignment, today())) return { error: "tooEarly" };

  let athleteIds: string[];
  if (user.role === "COACH") {
    athleteIds = assignment.athleteId
      ? [assignment.athleteId]
      : (await db.user.findMany({ where: { teamId: user.teamId, role: "ATHLETE" }, select: { id: true } })).map((a) => a.id);
  } else {
    if (assignment.athleteId && assignment.athleteId !== user.id) throw new Error("FORBIDDEN");
    athleteIds = [user.id];
  }
  const existing = new Map(
    (await db.biomotorResult.findMany({ where: { assignmentId: assignment.id, athleteId: { in: athleteIds } } }))
      .map((r) => [resultField(r.athleteId, r.testId), r]),
  );

  const changes: { athleteId: string; testId: string; value: number | null }[] = [];
  for (const athleteId of athleteIds) {
    for (const test of assignmentTests(assignment.tests)) {
      const key = resultField(athleteId, test.id);
      const current = existing.get(key);
      if (!form.has(key) || (user.role !== "COACH" && current && current.recordedById !== user.id)) continue;
      const value = parseScore(test, form.get(key));
      if (value === "invalid") return { error: "invalidScore" };
      // Unchanged scores keep who recorded them.
      if (value === (current?.value ?? null)) continue;
      changes.push({ athleteId, testId: test.id, value });
    }
  }

  await db.$transaction(
    changes.map(({ athleteId, testId, value }) => {
      const where = { assignmentId_athleteId_testId: { assignmentId: assignment.id, athleteId, testId } };
      return value == null
        ? db.biomotorResult.deleteMany({ where: { assignmentId: assignment.id, athleteId, testId } })
        : db.biomotorResult.upsert({
            where,
            create: { assignmentId: assignment.id, athleteId, testId, value, recordedById: user.id },
            update: { value, recordedById: user.id },
          });
    }),
  );
  revalidatePath("/", "layout");
  return { ok: true };
}
