import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CalendarCheck2, CalendarPlus, Check, CheckCircle2, Dumbbell, Gauge, PencilLine, ScanLine, ShieldCheck, UserMinus } from "lucide-react";
import { db } from "@/lib/db";
import { managedAthlete, requireCoach } from "@/lib/auth/guards";
import { ageFrom } from "@/lib/nutrition/calc";
import { asMacros, deriveBodyComp, getActivePlan } from "@/lib/plan/service";
import { planWeekOf, today } from "@/lib/dates";
import { athleteStatus } from "@/lib/coach";
import { attendanceRate } from "@/lib/schedule";
import { prescription } from "@/lib/training/format";
import { geminiEnabled } from "@/lib/ai/gemini";
import { confirmConsent, removeAthlete } from "@/actions/coach";
import type { Adjustment } from "@/lib/nutrition/adjust";
import { InBodyForm } from "@/components/forms/InBodyForm";
import { LineChartCard } from "@/components/LineChartCard";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListGroup, ListRow } from "@/components/ui/List";

/** One athlete, seen by their coach: status, targets, this week's training, check-ins; add a scan. */
export default async function CoachAthletePage({ params, searchParams }: {
  params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ scan?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user: coach } = await requireCoach(locale);
  const athlete = await managedAthlete(coach, id);
  if (!athlete) notFound();
  const [t, ts, tt, to, tc, tsc, tb, format] = await Promise.all([
    getTranslations("coach"), getTranslations("sports"), getTranslations("train"), getTranslations("onboarding"), getTranslations("coachTraining"), getTranslations("schedule"), getTranslations("biomotor"), getFormatter(),
  ]);

  const [profile, plan, scans, attendance, tests] = await Promise.all([
    db.athleteProfile.findUnique({ where: { userId: athlete.id } }),
    getActivePlan(athlete.id),
    db.inBodyScan.findMany({ where: { userId: athlete.id, confirmed: true }, orderBy: { takenAt: "asc" } }),
    db.attendance.findMany({ where: { athleteId: athlete.id, session: { teamId: coach.teamId! } }, select: { status: true } }),
    db.biomotorResult.findMany({ where: { athleteId: athlete.id, assignment: { teamId: coach.teamId! } }, select: { assignment: { select: { day: true } } } }),
  ]);
  const lastTested = tests.map((r) => r.assignment.day).sort().at(-1);
  const rate = attendanceRate(attendance);
  const checkIns = plan ? await db.checkIn.findMany({ where: { planId: plan.id }, orderBy: { weekNumber: "asc" } }) : [];
  const status = athleteStatus({ profile, plan: plan && { startDay: plan.startDay, checkInWeeks: checkIns.map((c) => c.weekNumber) } });
  const week = plan ? planWeekOf(plan.startDay, today()) ?? 4 : null;
  const planWeek = plan?.weeks.find((w) => w.weekNumber === week);
  const sessions = plan && week
    ? await db.programDay.findMany({
        where: { program: { planId: plan.id }, weekNumber: week },
        orderBy: { day: "asc" },
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } }, workouts: { select: { finishedAt: true } } },
      })
    : [];
  const isAr = locale.startsWith("ar");
  const label = (d: Date) => format.dateTime(d, { day: "numeric", month: "short" });
  const dayLabel = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { weekday: "short", day: "numeric", month: "short" });
  const weight = [
    ...scans.map((s) => ({ at: s.takenAt, weight: s.weightKg })),
    ...checkIns.filter((c) => !c.scanId).map((c) => ({ at: c.createdAt, weight: c.bodyWeightKg })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime()).map((p) => ({ label: label(p.at), weight: p.weight }));
  const latestScan = scans.at(-1);
  const bf = latestScan ? deriveBodyComp(latestScan).bf : null;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/coach", label: t("athletes") }}
        title={athlete.name}
        subtitle={profile
          ? [ts.has(profile.sport) ? ts(profile.sport) : profile.sport, t("age", { n: ageFrom(profile.birthDate) }), to(`goals.${profile.goal}.title`)].join(" · ")
          : t(`status.ONBOARDING`)}
      />

      {(await searchParams).scan && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-5" aria-hidden />{t("scanSaved")}
        </p>
      )}

      {status.kind === "CONSENT" && (
        <section className="card space-y-3">
          <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-warn" aria-hidden />{t("consentTitle")}</p>
          <p className="footnote">{t("consentBody", { name: athlete.name })}</p>
          <form action={confirmConsent.bind(null, athlete.id)}>
            <SubmitButton className="btn-primary w-full">{t("confirmConsent")}</SubmitButton>
          </form>
        </section>
      )}

      {profile && status.kind !== "CONSENT" && (
        <p className="footnote rounded-2xl bg-surface px-4 py-3">{t(`status.${status.kind}`, { week: "week" in status ? status.week : 0 })}</p>
      )}

      {planWeek && (
        <dl className="grid grid-cols-3 gap-3">
          {[
            { label: t("trainingKcal"), value: format.number(asMacros(planWeek.training).kcal), unit: "kcal" },
            { label: t("restKcal"), value: format.number(asMacros(planWeek.rest).kcal), unit: "kcal" },
            { label: t("protein"), value: format.number(asMacros(planWeek.training).proteinG), unit: "g" },
          ].map((s) => (
            <div key={s.label} className="card px-3.5">
              <dt className="caption">{s.label}</dt>
              <dd className="mt-1 text-lg font-bold tnum">{s.value}<span className="ms-0.5 text-xs font-normal text-muted">{s.unit}</span></dd>
            </div>
          ))}
        </dl>
      )}

      <ListGroup>
        {plan && (
          <ListRow href={`/coach/athletes/${athlete.id}/training`} icon={<PencilLine className="size-[1.125rem]" />}
            title={tc("editTraining")} subtitle={tc("editTrainingHint")} />
        )}
        <ListRow icon={<CalendarCheck2 className="size-[1.125rem]" />} title={tsc("attendance")}
          subtitle={rate != null ? tsc("rateDetail", { present: attendance.filter((a) => a.status === "PRESENT").length, total: attendance.length }) : tsc("noRecords")}
          value={rate != null ? `${format.number(rate)}%` : undefined} />
        <ListRow href={`/coach/athletes/${athlete.id}/tests`} icon={<Gauge className="size-[1.125rem]" />} title={tb("title")}
          subtitle={lastTested ? tb("rowSubtitle", { n: tests.length, date: dayLabel(lastTested) }) : tb("rowEmpty")} />
        <ListRow href={`/coach/schedule/new?athlete=${athlete.id}`} icon={<CalendarPlus className="size-[1.125rem]" />}
          title={tsc("addFor", { name: athlete.name })} />
      </ListGroup>

      {sessions.length > 0 && (
        <ListGroup title={t("thisWeek", { n: week ?? 1 })}>
          {sessions.map((d) => {
            const done = d.workouts.some((w) => w.finishedAt);
            return (
              <details key={d.id}>
                <summary className="flex min-h-[3.25rem] cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3" aria-hidden><Dumbbell className="size-[1.125rem]" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-medium">{tt.has(`focus.${d.focus}`) ? tt(`focus.${d.focus}`) : d.focus}</span>
                    <span className="footnote block">{dayLabel(d.day)}{d.isDeload ? ` · ${tt("deload")}` : ""}</span>
                  </span>
                  {done && <span className="pill bg-ok/15 text-ok"><Check className="size-3.5" aria-hidden />{tt("done")}</span>}
                </summary>
                <ul className="space-y-1.5 border-t border-line px-4 py-3">
                  {d.exercises.map((e) => (
                    <li key={e.id} className="flex justify-between gap-3 text-sm">
                      <span className="truncate text-muted">{isAr ? e.exercise.nameAr : e.exercise.nameEn}</span>
                      <span className="shrink-0 tnum" dir="ltr">{prescription({ ...e, measure: e.exercise.measure })}</span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </ListGroup>
      )}

      {weight.length > 0 && (
        <LineChartCard title={t("weightChart")} unit="kg" data={weight} empty={t("chartEmpty")} series={[{ key: "weight", label: t("weight"), color: "#ff6b7a" }]} />
      )}

      {checkIns.length > 0 && (
        <section>
          <h2 className="section-label">{t("checkins")}</h2>
          <div className="space-y-2">
            {[...checkIns].reverse().map((c) => {
              const a = c.adjustment as unknown as Adjustment;
              return (
                <details key={c.id} className="list-group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex-1 font-medium">{t("checkinWeek", { n: c.weekNumber })}</span>
                    <span className="text-sm text-muted tnum" dir="ltr">{c.bodyWeightKg} kg · {a.ratePct > 0 ? "+" : ""}{a.ratePct}% · {c.adherence}/10</span>
                  </summary>
                  <div className="space-y-2 border-t border-line px-4 py-3 text-[0.9375rem]">
                    <p className="footnote tnum">{t("checkinScores", { energy: c.energy, sleep: c.sleep, performance: c.performance, sessions: Math.round(c.trainingAdherence * 100) })}</p>
                    {c.notes && <p dir="auto"><span className="font-medium">{t("notes")}: </span>{c.notes}</p>}
                    <p className="leading-relaxed text-muted" dir="auto">{c.followUp}</p>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}

      {profile && status.kind !== "CONSENT" && (
        <section>
          <h2 className="section-label">{t("addScan")}</h2>
          {latestScan && (
            <ListGroup className="mb-3">
              <ListRow icon={<ScanLine className="size-[1.125rem]" />} title={t("latestScan", { date: format.dateTime(latestScan.takenAt, { dateStyle: "medium" }) })}
                subtitle={[`${latestScan.weightKg} kg`, bf != null ? `${format.number(bf, { maximumFractionDigits: 1 })}%` : null].filter(Boolean).join(" · ")} />
            </ListGroup>
          )}
          <p className="footnote mb-3 px-1">{plan ? t("addScanReplaces") : t("addScanHint")}</p>
          <InBodyForm purpose="plan" aiEnabled={geminiEnabled()} athleteId={athlete.id} />
        </section>
      )}

      <form action={removeAthlete.bind(null, athlete.id)} className="list-group">
        <SubmitButton className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-start font-medium text-accent hover:bg-surface-2">
          <UserMinus className="size-5" aria-hidden />{t("remove")}
        </SubmitButton>
      </form>
      <p className="footnote px-4">{t("removeHint")}</p>
    </div>
  );
}
