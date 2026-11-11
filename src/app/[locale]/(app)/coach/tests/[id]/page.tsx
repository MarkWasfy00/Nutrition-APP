import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, ClipboardList, Pencil, Printer, StickyNote, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireCoach } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { assignmentTests, canRecord, resultField } from "@/lib/biomotor";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { PrintButton } from "@/components/PrintButton";
import { ResultsForm, type ScoreCell } from "@/components/biomotor/ResultsForm";
import { TeamReport } from "@/components/biomotor/TeamReport";

/** One testing assignment: details, score entry for the coach, and the squad report. */
export default async function CoachAssignmentPage({ params, searchParams }: {
  params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ view?: string; saved?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { team } = await requireCoach(locale);
  const assignment = await db.biomotorAssignment.findFirst({
    where: { id, teamId: team.id },
    include: { athlete: { select: { id: true, name: true } }, results: true },
  });
  if (!assignment) notFound();
  const sp = await searchParams;
  const [t, format] = await Promise.all([getTranslations("biomotor"), getFormatter()]);
  const athletes = assignment.athlete
    ? [assignment.athlete]
    : await db.user.findMany({ where: { teamId: team.id, role: "ATHLETE" }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const day = today();
  const open = canRecord(assignment, day);
  const report = open && sp.view === "report";
  const date = format.dateTime(new Date(`${assignment.day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const tests = assignmentTests(assignment.tests);
  const cells: Record<string, ScoreCell> = Object.fromEntries(
    assignment.results.map((r) => [resultField(r.athleteId, r.testId), { value: r.value, byAthlete: r.recordedById === r.athleteId }]),
  );

  const facts = [
    { Icon: CalendarDays, text: date },
    { Icon: Users, text: assignment.athlete ? assignment.athlete.name : t("wholeTeam") },
    { Icon: ClipboardList, text: tests.map((x) => t(`tests.${x.id}.name`)).join(" · ") },
    assignment.notes ? { Icon: StickyNote, text: <span dir="auto" className="whitespace-pre-line">{assignment.notes}</span> } : null,
  ].filter((f) => f !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: assignment.day < day ? "/coach/tests?view=past" : "/coach/tests", label: t("title") }}
        title={assignment.title || t("title")}
        subtitle={team.name}
        action={
          <div className="flex gap-2">
            {report && <PrintButton label={t("print")} icon={<Printer className="size-5" aria-hidden />} />}
            <Link href={`/coach/tests/${assignment.id}/edit`} className="icon-btn no-print bg-surface" aria-label={t("edit")}><Pencil className="size-5" aria-hidden /></Link>
          </div>
        }
      />
      {sp.saved && (
        <p role="status" className="no-print flex items-center gap-2 rounded-2xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-5" aria-hidden />{t("saved")}
        </p>
      )}
      <ul className="list-group divide-y divide-line">
        {facts.map(({ Icon, text }, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3 text-[0.9375rem]">
            <Icon className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden /><span className="min-w-0">{text}</span>
          </li>
        ))}
      </ul>

      {!open ? (
        <p className="footnote rounded-2xl bg-surface px-4 py-3">{t("resultsOpen", { date })}</p>
      ) : athletes.length === 0 ? (
        <p className="footnote rounded-2xl bg-surface px-4 py-3">{t("noAthletes")}</p>
      ) : (
        <>
          <Segmented label={t("title")} items={[
            { href: `/coach/tests/${assignment.id}`, label: t("results"), active: !report },
            { href: `/coach/tests/${assignment.id}?view=report`, label: t("report"), active: report },
          ]} />
          {report
            ? <TeamReport assignment={assignment} athletes={athletes} results={assignment.results} />
            : <ResultsForm assignmentId={assignment.id} testIds={assignment.tests} athletes={athletes} cells={cells} />}
        </>
      )}
    </div>
  );
}
