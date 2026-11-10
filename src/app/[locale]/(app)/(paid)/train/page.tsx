import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Check, ChevronRight, History } from "lucide-react";
import { db } from "@/lib/db";
import { requirePaidUser } from "@/lib/auth/guards";
import { getActivePlan } from "@/lib/plan/service";
import { planWeekOf, today } from "@/lib/dates";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";

export default async function TrainPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ week?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await requirePaidUser(locale);
  const plan = await getActivePlan(user.id);
  if (!plan) redirect(`/${locale}/inbody/new`);
  const [t, format] = await Promise.all([getTranslations("train"), getFormatter()]);

  const current = planWeekOf(plan.startDay, today()) ?? 4;
  const weekNumber = Math.min(4, Math.max(1, Number((await searchParams).week) || current));
  const program = await db.trainingProgram.findUnique({
    where: { planId: plan.id },
    include: {
      days: {
        where: { weekNumber },
        orderBy: { day: "asc" },
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } }, workouts: { where: { userId: user.id } } },
      },
    },
  });
  const isAr = locale.startsWith("ar");
  const dayLabel = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={program ? t(`splits.${program.split}`) : undefined}
        action={<Link href="/train/history" className="icon-btn bg-surface" aria-label={t("history")}><History className="size-5" aria-hidden /></Link>}
      />

      <Segmented
        label={t("weeks")}
        items={[1, 2, 3, 4].map((n) => ({ href: `/train?week=${n}`, label: t("week", { n }), active: n === weekNumber, marker: n === current }))}
      />
      {weekNumber === 4 && <p className="footnote rounded-2xl bg-surface px-4 py-3">{t("deloadNote")}</p>}

      <ul className="space-y-3">
        {program?.days.map((d) => {
          const done = d.workouts.some((w) => w.finishedAt);
          const isToday = d.day === today();
          return (
            <li key={d.id}>
              <Link href={`/train/${d.id}`} className={`card block transition-colors hover:bg-surface-2 ${isToday ? "ring-1 ring-accent/60" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="caption">{dayLabel(d.day)}{isToday ? ` · ${t("today")}` : ""}</p>
                    <p className="title mt-0.5">{t(`focus.${d.focus}`)}</p>
                  </div>
                  {done
                    ? <span className="pill bg-ok/15 text-ok"><Check className="size-3.5" aria-hidden />{t("done")}</span>
                    : <ChevronRight className="size-5 text-subtle rtl:rotate-180" aria-hidden />}
                </div>
                <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {d.exercises.map((e) => (
                    <li key={e.id} className="flex justify-between gap-3 text-[0.9375rem]">
                      <span className="truncate text-muted">{isAr ? e.exercise.nameAr : e.exercise.nameEn}</span>
                      <span className="shrink-0 tnum" dir="ltr">{e.sets} × {e.repMin}–{e.repMax}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
