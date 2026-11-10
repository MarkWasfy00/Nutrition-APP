import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarClock, ScanLine } from "lucide-react";
import { db } from "@/lib/db";
import { requirePaidUser } from "@/lib/auth/guards";
import { dueCheckInWeek, getActivePlan, nextCheckInDay } from "@/lib/plan/service";
import type { Macros } from "@/lib/nutrition/types";
import type { Adjustment } from "@/lib/nutrition/adjust";
import { Link } from "@/i18n/navigation";
import { CheckInForm } from "@/components/forms/CheckInForm";
import { PageHeader } from "@/components/ui/PageHeader";

type StoredAdjustment = Adjustment & { newTraining: Macros; newRest: Macros };
type T = Awaited<ReturnType<typeof getTranslations<"checkin">>>;

export default async function CheckInPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ done?: string; scan?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await requirePaidUser(locale);
  const [t, format] = await Promise.all([getTranslations("checkin"), getFormatter()]);
  const sp = await searchParams;

  const plan = await getActivePlan(user.id);
  const history = await db.checkIn.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12 });
  const latest = history[0];
  const doneWeeks = plan ? history.filter((c) => c.planId === plan.id).map((c) => c.weekNumber) : [];
  const due = plan ? dueCheckInWeek(plan.startDay, doneWeeks) : null;
  const next = plan ? nextCheckInDay(plan.startDay, doneWeeks) : null;
  const scan = sp.scan ? await db.inBodyScan.findFirst({ where: { id: sp.scan, userId: user.id } }) : null;
  const date = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" });
  const past = history.slice(sp.done ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={due && !sp.done ? t("weekTitle", { week: due }) : undefined} />

      {sp.done && latest && <Result c={latest} t={t} />}

      {!sp.done && due && <CheckInForm scan={scan ? { id: scan.id, weightKg: scan.weightKg } : null} />}

      {!due && plan && next && !sp.done && (
        <div className="card flex items-center gap-3">
          <CalendarClock className="size-6 shrink-0 text-accent" aria-hidden />
          <p className="text-[0.9375rem]">{t("nextOn", { week: next.week, date: date(next.day) })}</p>
        </div>
      )}

      {!plan && (
        <div className="card space-y-4 text-center">
          <ScanLine className="mx-auto size-8 text-accent" aria-hidden />
          <p>{t("blockComplete")}</p>
          <Link href="/inbody/new" className="btn-primary w-full">{t("newBlock")}</Link>
        </div>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="section-label">{t("history")}</h2>
          <div className="space-y-2">
            {past.map((c) => {
              const a = c.adjustment as unknown as StoredAdjustment;
              return (
                <details key={c.id} className="list-group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex-1 font-medium">{t("weekTitle", { week: c.weekNumber })}</span>
                    <span className="text-sm text-muted tnum" dir="ltr">{c.bodyWeightKg} kg · {a.ratePct > 0 ? "+" : ""}{a.ratePct}%</span>
                  </summary>
                  <p className="border-t border-line px-4 py-3 text-[0.9375rem] leading-relaxed" dir="auto">{c.followUp}</p>
                </details>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Result({ c, t }: { c: { weekNumber: number; bodyWeightKg: number; trainingAdherence: number; followUp: string; adjustment: unknown }; t: T }) {
  const a = c.adjustment as StoredAdjustment;
  const stats = [
    { label: t("rate"), value: `${a.ratePct > 0 ? "+" : ""}${a.ratePct}%` },
    { label: t("weightShort"), value: `${c.bodyWeightKg} kg` },
    { label: t("sessions"), value: `${Math.round(c.trainingAdherence * 100)}%` },
  ];
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="title">{t("resultTitle", { week: c.weekNumber })}</h2>
          <span className={`pill tnum ${a.kcalDelta === 0 ? "bg-surface-2 text-muted" : "bg-tonal text-accent"}`} dir="ltr">
            {a.kcalDelta > 0 ? "+" : ""}{a.kcalDelta} kcal
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl bg-surface-2 py-3 text-center rtl:divide-x-reverse">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="caption">{s.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tnum" dir="ltr">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm font-medium text-accent">{t(`reasons.${a.reason}`)}</p>
        <p className="mt-2 whitespace-pre-line leading-relaxed" dir="auto">{c.followUp}</p>
        {a.newTraining && <p className="footnote mt-3 tnum">{t("newTargets", { training: a.newTraining.kcal, rest: a.newRest.kcal })}</p>}
      </div>
      <Link href="/plan" className="btn-primary btn-lg w-full">{t("seePlan")}</Link>
    </div>
  );
}
