import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Lock, RotateCcw, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { managedAthlete, requireCoach } from "@/lib/auth/guards";
import { weekdayOf } from "@/lib/dates";
import { EXERCISES } from "@/lib/training/library";
import { prescription } from "@/lib/training/format";
import { removeSession, resetSession } from "@/actions/coachTraining";
import { SessionEditor, type EditorOption } from "@/components/forms/SessionEditor";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui/PageHeader";

/** Coach edits one S&C session of an athlete in their team. */
export default async function CoachSessionEditPage({ params }: { params: Promise<{ locale: string; id: string; dayId: string }> }) {
  const { locale, id, dayId } = await params;
  setRequestLocale(locale);
  const { user: coach } = await requireCoach(locale);
  const athlete = await managedAthlete(coach, id);
  if (!athlete) notFound();
  const day = await db.programDay.findFirst({
    where: { id: dayId, program: { plan: { userId: athlete.id, status: "ACTIVE" } } },
    include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } }, workouts: { select: { finishedAt: true } } },
  });
  if (!day) notFound();
  const [t, tt, to, format, pref, laterDays] = await Promise.all([
    getTranslations("coachTraining"), getTranslations("train"), getTranslations("onboarding"), getFormatter(),
    db.trainingPreference.findUnique({ where: { userId: athlete.id } }),
    db.programDay.findMany({
      where: { programId: day.programId, day: { gt: day.day }, focus: day.focus, workouts: { none: {} } },
      select: { day: true },
    }),
  ]);
  const isAr = locale.startsWith("ar");
  const finished = day.workouts.some((w) => w.finishedAt);
  const started = day.workouts.length > 0;
  const injuries = pref?.injuries ?? [];
  const options: EditorOption[] = EXERCISES.map((e) => ({
    id: e.id, name: isAr ? e.nameAr : e.nameEn, pattern: e.muscle, measure: e.measure,
    warn: e.stresses.some((s) => injuries.includes(s)),
  }));
  const laterCount = laterDays.filter((d) => weekdayOf(d.day) === weekdayOf(day.day)).length;
  const focus = tt.has(`focus.${day.focus}`) ? tt(`focus.${day.focus}`) : day.focus;
  const back = `/coach/athletes/${athlete.id}/training?week=${day.weekNumber}`;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: back, label: t("title") }}
        title={focus}
        subtitle={[
          athlete.name,
          format.dateTime(new Date(`${day.day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" }),
          day.isDeload ? tt("deload") : null,
        ].filter(Boolean).join(" · ")}
      />

      {finished ? (
        <section className="space-y-3">
          <p className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm"><Lock className="size-4 shrink-0 text-muted" aria-hidden />{t("locked", { name: athlete.name })}</p>
          <ul className="list-group divide-y divide-line">
            {day.exercises.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 px-4 py-3 text-[0.9375rem]">
                <span className="truncate">{isAr ? e.exercise.nameAr : e.exercise.nameEn}</span>
                <span className="shrink-0 text-muted tnum" dir="ltr">{prescription({ ...e, measure: e.exercise.measure })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          {injuries.length > 0 && (
            <p className="footnote rounded-2xl bg-warn/10 px-4 py-3 text-warn">
              {t("injuries", { name: athlete.name, list: format.list(injuries.map((i) => to(`injuryOptions.${i}`))) })}
            </p>
          )}
          <SessionEditor
            athleteId={athlete.id}
            dayId={day.id}
            weekNumber={day.weekNumber}
            laterCount={laterCount}
            options={options}
            initial={day.exercises.map((e) => ({
              exerciseId: e.exerciseId, sets: e.sets, repMin: e.repMin, repMax: e.repMax, distanceM: e.distanceM, targetRpe: e.targetRpe, restSec: e.restSec,
            }))}
          />

          <section className="space-y-2">
            {day.editedAt && (
              <form action={resetSession.bind(null, athlete.id, day.id)} className="list-group">
                <SubmitButton className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-start font-medium hover:bg-surface-2">
                  <RotateCcw className="size-5 text-muted" aria-hidden />{t("reset")}
                </SubmitButton>
              </form>
            )}
            {!started && (
              <form action={removeSession.bind(null, athlete.id, day.id)} className="list-group">
                <SubmitButton className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-start font-medium text-accent hover:bg-surface-2">
                  <Trash2 className="size-5" aria-hidden />{t("removeSession")}
                </SubmitButton>
              </form>
            )}
            {day.editedAt && <p className="footnote px-4">{t("resetHint")}</p>}
            {!started && <p className="footnote px-4">{t("removeHint")}</p>}
          </section>
        </>
      )}
    </div>
  );
}
