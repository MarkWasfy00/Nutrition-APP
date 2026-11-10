import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Dumbbell, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { requirePaidUser } from "@/lib/auth/guards";
import { bestE1RM } from "@/lib/training/progress";
import { Link } from "@/i18n/navigation";
import { LineChartCard } from "@/components/LineChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListGroup, ListRow } from "@/components/ui/List";

export default async function HistoryPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ ex?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await requirePaidUser(locale);
  const [t, format] = await Promise.all([getTranslations("train"), getFormatter()]);
  const isAr = locale.startsWith("ar");

  const workouts = await db.workoutLog.findMany({
    where: { userId: user.id, sets: { some: {} } },
    orderBy: { startedAt: "asc" },
    include: { sets: { include: { exercise: true } }, programDay: true },
  });
  const exercises = new Map<string, string>();
  workouts.forEach((w) => w.sets.forEach((s) => exercises.set(s.exerciseId, isAr ? s.exercise.nameAr : s.exercise.nameEn)));
  const selected = (await searchParams).ex ?? [...exercises.keys()][0];
  const label = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { day: "numeric", month: "short" });

  const series = workouts
    .map((w) => {
      const sets = w.sets.filter((s) => s.exerciseId === selected);
      if (!sets.length) return null;
      return { label: label(w.day), e1rm: bestE1RM(sets), volume: Math.round(sets.reduce((a, s) => a + s.weightKg * s.reps, 0)) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/train", label: t("title") }} title={t("history")} />

      {exercises.size === 0 ? (
        <div className="card py-10 text-center">
          <Dumbbell className="mx-auto size-8 text-subtle" aria-hidden />
          <p className="footnote mt-3">{t("noHistory")}</p>
        </div>
      ) : (
        <>
          <nav aria-label={t("exercise")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {[...exercises].map(([id, name]) => (
              <Link key={id} href={`/train/history?ex=${id}`} aria-current={id === selected ? "true" : undefined}
                className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors ${id === selected ? "bg-fg text-bg" : "bg-surface text-muted hover:text-fg"}`}>
                {name}
              </Link>
            ))}
          </nav>
          <LineChartCard title={t("e1rm")} unit="kg" data={series} empty={t("chartEmpty")} series={[{ key: "e1rm", label: t("e1rm"), color: "#ff6b7a" }]} />
          <LineChartCard title={t("volume")} unit="kg" data={series} empty={t("chartEmpty")} series={[{ key: "volume", label: t("volume"), color: "#f5b544" }]} />
        </>
      )}

      {workouts.length > 0 && (
        <ListGroup title={t("sessions")}>
          {[...workouts].reverse().map((w) => {
            const prs = w.sets.filter((s) => s.isPR).length;
            return (
              <ListRow
                key={w.id}
                icon={<Dumbbell className="size-[1.125rem]" />}
                title={w.programDay ? t(`focus.${w.programDay.focus}`) : "—"}
                subtitle={`${label(w.day)} · ${t("setsCount", { n: w.sets.length })}${w.durationMin ? ` · ${t("minutes", { n: w.durationMin })}` : ""}`}
                value={prs > 0 ? <span className="pill bg-warn/15 text-warn"><Trophy className="size-3.5" aria-hidden />{t("prs", { n: prs })}</span> : undefined}
              />
            );
          })}
        </ListGroup>
      )}
    </div>
  );
}
