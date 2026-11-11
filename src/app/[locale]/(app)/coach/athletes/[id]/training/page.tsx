import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Check, CheckCircle2, ChevronRight, PencilLine } from "lucide-react";
import { db } from "@/lib/db";
import { managedAthlete, requireCoach } from "@/lib/auth/guards";
import { getActivePlan } from "@/lib/plan/service";
import { planWeekOf, today } from "@/lib/dates";
import { prescription } from "@/lib/training/format";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";

/** An athlete's 4-week S&C program as their coach sees it; each session opens the editor. */
export default async function CoachAthleteTrainingPage({ params, searchParams }: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ week?: string; saved?: string; reset?: string; removed?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user: coach } = await requireCoach(locale);
  const athlete = await managedAthlete(coach, id);
  if (!athlete) notFound();
  const plan = await getActivePlan(athlete.id);
  if (!plan) notFound();
  const sp = await searchParams;
  const [t, tt, format] = await Promise.all([getTranslations("coachTraining"), getTranslations("train"), getFormatter()]);

  const current = planWeekOf(plan.startDay, today()) ?? 4;
  const weekNumber = Math.min(4, Math.max(1, Number(sp.week) || current));
  const program = await db.trainingProgram.findUnique({
    where: { planId: plan.id },
    include: {
      days: {
        where: { weekNumber },
        orderBy: { day: "asc" },
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } }, workouts: { select: { finishedAt: true } } },
      },
    },
  });
  const isAr = locale.startsWith("ar");
  const dayLabel = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { weekday: "long", day: "numeric", month: "short" });
  const notice = sp.saved ? t("saved") : sp.reset ? t("resetDone") : sp.removed ? t("removed") : null;
  const base = `/coach/athletes/${athlete.id}/training`;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/coach/athletes/${athlete.id}`, label: athlete.name }}
        title={t("title")}
        subtitle={program ? tt(`phases.${program.phase}`) : undefined}
      />
      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-5" aria-hidden />{notice}
        </p>
      )}
      <Segmented
        label={tt("weeks")}
        items={[1, 2, 3, 4].map((n) => ({ href: `${base}?week=${n}`, label: tt("week", { n }), active: n === weekNumber, marker: n === current }))}
      />
      {weekNumber === 4 && <p className="footnote rounded-2xl bg-surface px-4 py-3">{t("deloadNote")}</p>}

      {program?.days.length ? (
        <ul className="space-y-3">
          {program.days.map((d) => {
            const done = d.workouts.some((w) => w.finishedAt);
            return (
              <li key={d.id}>
                <Link href={`${base}/${d.id}`} className="card block transition-colors hover:bg-surface-2">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="caption">{dayLabel(d.day)}{d.isDeload ? ` · ${tt("deload")}` : ""}</p>
                      <p className="title mt-0.5">{tt.has(`focus.${d.focus}`) ? tt(`focus.${d.focus}`) : d.focus}</p>
                    </div>
                    {d.editedAt && <span className="pill bg-tonal text-accent"><PencilLine className="size-3.5" aria-hidden />{t("edited")}</span>}
                    {done
                      ? <span className="pill bg-ok/15 text-ok"><Check className="size-3.5" aria-hidden />{tt("done")}</span>
                      : <ChevronRight className="size-5 text-subtle rtl:rotate-180" aria-hidden />}
                  </div>
                  <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                    {d.exercises.map((e) => (
                      <li key={e.id} className="flex justify-between gap-3 text-[0.9375rem]">
                        <span className="truncate text-muted">{isAr ? e.exercise.nameAr : e.exercise.nameEn}</span>
                        <span className="shrink-0 tnum" dir="ltr">{prescription({ ...e, measure: e.exercise.measure })} · RPE {e.targetRpe}</span>
                      </li>
                    ))}
                  </ul>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="footnote rounded-2xl bg-surface px-4 py-3">{t("noSessions")}</p>
      )}
      <p className="footnote px-1">{t("listHint")}</p>
    </div>
  );
}
