import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarCheck, ScanLine } from "lucide-react";
import { db } from "@/lib/db";
import { requirePaidUser } from "@/lib/auth/guards";
import { asMacros, deriveBodyComp } from "@/lib/plan/service";
import { LineChartCard } from "@/components/LineChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListGroup, ListRow } from "@/components/ui/List";

export default async function ProgressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await requirePaidUser(locale);
  const [t, format] = await Promise.all([getTranslations("progress"), getFormatter()]);

  const [scans, checkIns, plans, workouts] = await Promise.all([
    db.inBodyScan.findMany({ where: { userId: user.id, confirmed: true }, orderBy: { takenAt: "asc" } }),
    db.checkIn.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    db.nutritionPlan.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, include: { weeks: { orderBy: { weekNumber: "asc" } } } }),
    db.workoutLog.count({ where: { userId: user.id, finishedAt: { not: null } } }),
  ]);
  const label = (d: Date) => format.dateTime(d, { day: "numeric", month: "short" });
  const num = (v: number) => format.number(v, { maximumFractionDigits: 1 });

  const weight = [
    ...scans.map((s) => ({ at: s.takenAt, weight: s.weightKg })),
    ...checkIns.filter((c) => !c.scanId).map((c) => ({ at: c.createdAt, weight: c.bodyWeightKg })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime()).map((p) => ({ label: label(p.at), weight: p.weight }));

  const comp = scans.map((s) => {
    const { bf } = deriveBodyComp(s);
    return { label: label(s.takenAt), bodyFat: bf != null ? Math.round(bf * 10) / 10 : null, smm: s.skeletalMuscleMassKg };
  });
  const kcal = plans.flatMap((p, pi) => p.weeks.map((w) => ({
    label: `${pi + 1}.${w.weekNumber}`, training: asMacros(w.training).kcal, rest: asMacros(w.rest).kcal,
  })));

  const first = scans[0];
  const latestWeight = checkIns.at(-1)?.bodyWeightKg ?? scans.at(-1)?.weightKg;
  const bfNow = comp.at(-1)?.bodyFat;
  const bfFirst = comp[0]?.bodyFat;
  const delta = (d: number | null) => (d == null ? null : `${d > 0 ? "+" : ""}${num(d)}`);

  const stats = [
    { label: t("weight"), value: latestWeight != null ? num(latestWeight) : "—", unit: "kg", change: first && latestWeight != null ? delta(latestWeight - first.weightKg) : null },
    { label: t("bodyFat"), value: bfNow != null ? num(bfNow) : "—", unit: "%", change: comp.length > 1 && bfNow != null && bfFirst != null ? delta(bfNow - bfFirst) : null },
    { label: t("workouts"), value: format.number(workouts), unit: "", change: null },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      <dl className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card px-3.5">
            <dt className="caption">{s.label}</dt>
            <dd className="mt-1 text-xl font-bold tnum">{s.value}<span className="ms-0.5 text-xs font-normal text-muted">{s.unit}</span></dd>
            {s.change && <dd className="footnote tnum" dir="ltr">{s.change}</dd>}
          </div>
        ))}
      </dl>

      <LineChartCard title={t("weightChart")} unit="kg" data={weight} empty={t("chartEmpty")} series={[{ key: "weight", label: t("weight"), color: "#ff6b7a" }]} />
      <LineChartCard title={t("compChart")} unit="%" data={comp} empty={t("chartEmpty")} series={[
        { key: "bodyFat", label: t("bodyFat"), color: "#f5b544" },
        { key: "smm", label: t("smm"), color: "#7fb2ff" },
      ]} />
      <LineChartCard title={t("kcalChart")} unit="kcal" data={kcal} empty={t("chartEmpty")} series={[
        { key: "training", label: t("trainingDay"), color: "#ff6b7a" },
        { key: "rest", label: t("restDay"), color: "#a89ea0" },
      ]} />

      <ListGroup title={t("history")}>
        <ListRow href="/checkin" icon={<CalendarCheck className="size-[1.125rem]" />} title={t("checkins")} value={format.number(checkIns.length)} />
        {[...scans].reverse().map((s) => (
          <ListRow key={s.id} icon={<ScanLine className="size-[1.125rem]" />}
            title={format.dateTime(s.takenAt, { dateStyle: "medium" })}
            subtitle={[`${num(s.weightKg)} kg`, s.bodyFatPct != null ? `${num(s.bodyFatPct)}%` : null, s.skeletalMuscleMassKg != null ? `${t("smmShort")} ${num(s.skeletalMuscleMassKg)}` : null].filter(Boolean).join(" · ")} />
        ))}
      </ListGroup>
    </div>
  );
}
