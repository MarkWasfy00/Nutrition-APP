import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CalendarDays, StickyNote } from "lucide-react";
import { db } from "@/lib/db";
import { requirePaidUser } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { assignmentTests, canRecord, resultField } from "@/lib/biomotor";
import { athleteSessionsWhere } from "@/lib/schedule";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResultsForm, type ScoreCell } from "@/components/biomotor/ResultsForm";

/** Athlete enters their own scores for an assignment. Scores the coach entered are shown read-only. */
export default async function AthleteAssignmentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user } = await requirePaidUser(locale);
  const assignment = await db.biomotorAssignment.findFirst({
    where: { id, ...athleteSessionsWhere({ id: user.id, teamId: user.teamId! }) },
    include: { results: { where: { athleteId: user.id } } },
  });
  if (!assignment) notFound();
  const [t, format] = await Promise.all([getTranslations("biomotor"), getFormatter()]);
  const date = format.dateTime(new Date(`${assignment.day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" });
  const cells: Record<string, ScoreCell> = Object.fromEntries(
    assignment.results.map((r) => [resultField(r.athleteId, r.testId), { value: r.value, byAthlete: r.recordedById === user.id, locked: r.recordedById !== user.id }]),
  );

  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/tests", label: t("title") }} title={assignment.title || t("title")}
        subtitle={[assignment.athleteId ? t("personal") : t("wholeTeam"), t("testCount", { n: assignment.tests.length })].join(" · ")} />
      <ul className="list-group divide-y divide-line">
        <li className="flex items-start gap-3 px-4 py-3 text-[0.9375rem]"><CalendarDays className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />{date}</li>
        {assignment.notes && (
          <li className="flex items-start gap-3 px-4 py-3 text-[0.9375rem]">
            <StickyNote className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden /><span dir="auto" className="min-w-0 whitespace-pre-line">{assignment.notes}</span>
          </li>
        )}
      </ul>
      {canRecord(assignment, today()) ? (
        <>
          <ResultsForm self assignmentId={assignment.id} testIds={assignment.tests} athletes={[{ id: user.id, name: user.name }]} cells={cells} />
          <p className="footnote px-1">{t("athleteHint")}</p>
        </>
      ) : (
        <>
          <p className="footnote rounded-2xl bg-surface px-4 py-3">{t("resultsOpen", { date })}</p>
          <ul className="list-group divide-y divide-line">
            {assignmentTests(assignment.tests).map(({ id: testId }) => (
              <li key={testId} className="px-4 py-3">
                <p className="font-medium">{t(`tests.${testId}.name`)}</p>
                <p className="footnote">{t(`tests.${testId}.protocol`)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
