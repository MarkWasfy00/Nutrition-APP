import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { CalendarCheck, CalendarClock, Check, Dumbbell, Pill, ScanLine, X } from "lucide-react";
import { db } from "@/lib/db";
import { requirePaidUser } from "@/lib/auth/guards";
import { getDailyStatus } from "@/lib/nutrition/daily";
import { dueCheckInWeek } from "@/lib/plan/service";
import { today } from "@/lib/dates";
import { athleteSessionsWhere, endTime } from "@/lib/schedule";
import { allowedSupplements, supplementSchedule } from "@/lib/nutrition/supplements";
import { deleteFoodLog } from "@/actions/food";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListGroup, ListRow } from "@/components/ui/List";
import { ProgressBar, Ring } from "@/components/ui/Progress";
import { FoodLogger } from "@/components/FoodLogger";
import { MealToggle } from "@/components/MealToggle";
import { SubmitButton } from "@/components/SubmitButton";

export default async function TodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user, profile } = await requirePaidUser(locale);
  const status = await getDailyStatus(user.id);
  if (!status) redirect(`/${locale}/inbody/new`);
  const [t, tt, ts, tsc, format] = await Promise.all([
    getTranslations("today"), getTranslations("train"), getTranslations("supplements"), getTranslations("schedule"), getFormatter(),
  ]);

  if (status.expired) {
    return (
      <div className="card mt-8 space-y-4 text-center">
        <ScanLine className="mx-auto size-10 text-accent" aria-hidden />
        <h1 className="title">{t("blockDone")}</h1>
        <p className="footnote">{t("blockDoneBody")}</p>
        <Link href="/inbody/new" className="btn-primary w-full">{t("newScan")}</Link>
      </div>
    );
  }

  const day = today();
  const [workoutDay, checkIns, sessions] = await Promise.all([
    db.programDay.findFirst({
      where: { day, program: { planId: status.plan.id } },
      include: { exercises: true, workouts: { where: { userId: user.id } } },
    }),
    db.checkIn.findMany({ where: { planId: status.plan.id }, select: { weekNumber: true } }),
    db.teamSession.findMany({ where: { ...athleteSessionsWhere({ id: user.id, teamId: user.teamId! }), day }, orderBy: { startTime: "asc" } }),
  ]);
  const due = dueCheckInWeek(status.plan.startDay, checkIns.map((c) => c.weekNumber));
  const loggedKeys = new Set(status.logs.map((l) => l.planMealKey).filter(Boolean));
  const extraLogs = status.logs.filter((l) => !l.planMealKey);
  const n = (v: number) => format.number(Math.abs(Math.round(v)));
  const workoutDone = workoutDay?.workouts.some((w) => w.finishedAt);
  const supplements = supplementSchedule(allowedSupplements(profile), status.plan.scan.weightKg, status.type, locale);
  const over = status.remaining.kcal < 0;

  const macros = [
    { key: "protein", eaten: status.eaten.proteinG, target: status.target.proteinG, left: status.remaining.proteinG, color: "var(--color-protein)" },
    { key: "carbs", eaten: status.eaten.carbsG, target: status.target.carbsG, left: status.remaining.carbsG, color: "var(--color-carbs)" },
    { key: "fat", eaten: status.eaten.fatG, target: status.target.fatG, left: status.remaining.fatG, color: "var(--color-fat)" },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={`${format.dateTime(new Date(), { weekday: "long", day: "numeric", month: "long" })} · ${t("week", { n: status.weekNumber })}`}
        action={
          <span className={`pill ${status.type === "TRAINING" ? "bg-tonal text-accent" : "bg-surface-2 text-muted"}`}>
            {t(`dayType.${status.type}`)}
          </span>
        }
      />

      {due && (
        <Link href="/checkin" className="flex min-h-14 items-center gap-3 rounded-2xl bg-tonal px-4 text-accent">
          <CalendarCheck className="size-5 shrink-0" aria-hidden />
          <span className="flex-1 font-semibold">{t("checkinDue", { week: due })}</span>
          <span className="text-sm font-semibold">{t("open")}</span>
        </Link>
      )}

      <section aria-label={t("summary")} className="card">
        <div className="flex items-center gap-5">
          <Ring value={status.eaten.kcal} max={status.target.kcal} size={136} stroke={11} over={over}>
            <div>
              <p className={`text-[1.75rem] font-bold leading-none tnum ${over ? "text-warn" : ""}`}>{n(status.remaining.kcal)}</p>
              <p className="caption mt-1">{over ? t("kcalOver") : t("kcalLeft")}</p>
            </div>
          </Ring>
          <dl className="min-w-0 flex-1 space-y-3.5">
            {macros.map((m) => (
              <div key={m.key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <dt className="text-sm font-medium">{t(m.key)}</dt>
                  <dd className={`text-sm tnum ${m.left < 0 ? "text-warn" : "text-muted"}`}>
                    {m.left >= 0 ? t("left", { n: n(m.left) }) : t("over", { n: n(m.left) })}
                  </dd>
                </div>
                <ProgressBar value={m.eaten} max={m.target} color={m.color} label={`${t(m.key)} ${Math.round(m.eaten)} / ${m.target}`} />
              </div>
            ))}
          </dl>
        </div>
        <p className="footnote mt-4 border-t border-line pt-3 tnum">
          {t("eatenOf", { eaten: n(status.eaten.kcal), target: n(status.target.kcal) })}
          {user.addBackExerciseKcal && status.workoutKcal > 0 && ` · ${t("addedBack", { n: status.workoutKcal })}`}
        </p>
      </section>

      <ListGroup title={tsc("today")}>
        {sessions.map((s) => (
          <ListRow key={s.id} href="/schedule" icon={<CalendarClock className="size-[1.125rem]" />}
            title={s.title || tsc(`kinds.${s.kind}`)}
            subtitle={[s.title ? tsc(`kinds.${s.kind}`) : null, s.location, s.athleteId ? tsc("personal") : null].filter(Boolean).join(" · ") || undefined}
            value={<span dir="ltr">{s.startTime}–{endTime(s.startTime, s.durationMin)}</span>} />
        ))}
        <ListRow href="/schedule" icon={<CalendarClock className="size-[1.125rem]" />}
          title={sessions.length ? tsc("openSchedule") : tsc("noneToday")} subtitle={sessions.length ? undefined : tsc("openSchedule")} />
      </ListGroup>

      <ListGroup title={t("todaysWorkout")}>
        {workoutDay ? (
          <ListRow
            href={`/train/${workoutDay.id}`}
            icon={<Dumbbell className="size-[1.125rem]" />}
            title={tt.has(`focus.${workoutDay.focus}`) ? tt(`focus.${workoutDay.focus}`) : workoutDay.focus}
            subtitle={`${t("exercises", { n: workoutDay.exercises.length })}${workoutDay.isDeload ? ` · ${t("deload")}` : ""}`}
            value={workoutDone ? <span className="pill bg-ok/15 text-ok"><Check className="size-3.5" aria-hidden />{t("done")}</span> : <span className="font-semibold text-accent">{t("start")}</span>}
          />
        ) : (
          <ListRow icon={<Dumbbell className="size-[1.125rem]" />} title={t("restDayTitle")} subtitle={t("restDay")} />
        )}
      </ListGroup>

      {supplements.length > 0 && (
        <ListGroup title={ts("todayTitle")}>
          {supplements.map((s) => (
            <ListRow key={s.id} icon={<Pill className="size-[1.125rem]" />} title={s.name} subtitle={s.dose} />
          ))}
        </ListGroup>
      )}

      <ListGroup title={t("meals")}>
        {status.planDay?.meals.map((m) => {
          const logged = loggedKeys.has(m.key);
          return (
            <div key={m.key} className="flex items-start gap-3 px-4 py-3">
              <MealToggle mealKey={m.key} logged={logged} label={`${logged ? t("unmarkEaten") : t("markEaten")}: ${t(`slots.${m.slot}`)}`} />
              <div className={`min-w-0 flex-1 ${logged ? "opacity-60" : ""}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="caption">{t(`slots.${m.slot}`)}</p>
                  <p className="text-sm font-semibold tnum">{format.number(m.kcal)} <span className="font-normal text-muted">kcal</span></p>
                </div>
                <p className="mt-0.5 font-medium leading-snug" dir="auto">{m.name}</p>
                <p className="footnote mt-1" dir="auto">{m.items.map((i) => `${i.food} ${i.grams}g`).join(" · ")}</p>
              </div>
            </div>
          );
        })}
      </ListGroup>

      {extraLogs.length > 0 && (
        <ListGroup title={t("extraFoods")}>
          {extraLogs.map((l) => (
            <div key={l.id} className="flex min-h-[3.25rem] items-center gap-3 ps-4 pe-1">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{l.name}</span>
                {l.grams ? <span className="footnote">{l.grams} g</span> : null}
              </span>
              <span className="text-sm tnum text-muted">{format.number(Math.round(l.kcal))} kcal</span>
              <form action={deleteFoodLog.bind(null, l.id)}>
                <SubmitButton className="icon-btn" label={`${t("remove")}: ${l.name}`}><X className="size-4" aria-hidden /></SubmitButton>
              </form>
            </div>
          ))}
        </ListGroup>
      )}

      <FoodLogger />
    </div>
  );
}
