import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ChevronDown, Pill, Printer, ShoppingBasket } from "lucide-react";
import { requirePaidUser } from "@/lib/auth/guards";
import { asDays, asMacros, getActivePlan } from "@/lib/plan/service";
import { planWeekOf, today } from "@/lib/dates";
import type { GroceryItem } from "@/lib/nutrition/types";
import { allowedSupplements, supplementSchedule } from "@/lib/nutrition/supplements";
import { Link } from "@/i18n/navigation";
import { PrintButton } from "@/components/PrintButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { ListGroup, ListRow } from "@/components/ui/List";

export default async function PlanPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ week?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user, profile } = await requirePaidUser(locale);
  const plan = await getActivePlan(user.id);
  if (!plan) redirect(`/${locale}/inbody/new`);
  const [t, ts, format] = await Promise.all([getTranslations("plan"), getTranslations("supplements"), getFormatter()]);

  const current = planWeekOf(plan.startDay, today()) ?? 4;
  const weekNumber = Math.min(4, Math.max(1, Number((await searchParams).week) || current));
  const week = plan.weeks.find((w) => w.weekNumber === weekNumber)!;
  const days = asDays(week.days);
  const grocery = week.groceryList as unknown as GroceryItem[];
  const supplements = supplementSchedule(allowedSupplements(profile), plan.scan.weightKg, null, locale);
  const dayLabel = (d: string, long = false) =>
    format.dateTime(new Date(`${d}T12:00:00Z`), { weekday: long ? "long" : "short", day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("range", { from: dayLabel(plan.startDay), to: dayLabel(plan.endDay) })}
        action={<PrintButton label={t("print")} icon={<Printer className="size-5" aria-hidden />} />}
      />

      <Segmented
        label={t("weeks")}
        items={[1, 2, 3, 4].map((n) => ({ href: `/plan?week=${n}`, label: t("week", { n }), active: n === weekNumber, marker: n === current }))}
      />

      <div className="grid grid-cols-2 gap-3">
        {(["TRAINING", "REST"] as const).map((type) => {
          const m = asMacros(type === "TRAINING" ? week.training : week.rest);
          return (
            <div key={type} className="card">
              <p className="caption">{t(`dayType.${type}`)}</p>
              <p className="mt-1 text-2xl font-bold tnum">{format.number(m.kcal)}<span className="ms-1 text-sm font-normal text-muted">kcal</span></p>
              <p className="footnote mt-1 tnum">P {m.proteinG} · C {m.carbsG} · F {m.fatG}</p>
            </div>
          );
        })}
      </div>

      <section>
        <h2 className="section-label">{t("days")}</h2>
        <div className="space-y-2">
          {days.map((d) => {
            const kcal = d.meals.reduce((a, m) => a + m.kcal, 0);
            return (
              <details key={d.day} className="list-group group/day" open={d.day === today()}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
                  <span className={`size-2 shrink-0 rounded-full ${d.type === "TRAINING" ? "bg-accent" : "bg-subtle"}`} aria-hidden />
                  <span className="flex-1">
                    <span className="block font-medium">{dayLabel(d.day, true)}</span>
                    <span className="footnote">{t(`dayType.${d.type}`)}{d.day === today() ? ` · ${t("today")}` : ""}</span>
                  </span>
                  <span className="text-sm text-muted tnum">{format.number(kcal)} kcal</span>
                  <ChevronDown className="size-4 text-subtle transition-transform group-open/day:rotate-180" aria-hidden />
                </summary>
                <ul className="divide-y divide-line border-t border-line">
                  {d.meals.map((m) => (
                    <li key={m.key} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="caption">{t(`slots.${m.slot}`)}</span>
                        <span className="text-sm font-semibold tnum">{format.number(m.kcal)} <span className="font-normal text-muted">kcal</span></span>
                      </div>
                      <p className="mt-0.5 font-medium" dir="auto">{m.name}</p>
                      <p className="footnote mt-1" dir="auto">{m.items.map((i) => `${i.food} ${i.grams}g`).join(" · ")}</p>
                      <p className="footnote mt-1 tnum">P {m.proteinG} · C {m.carbsG} · F {m.fatG}</p>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      <ListGroup
        title={ts("title")}
        footer={<Link href="/settings#supplements" className="font-medium text-accent">{ts("change")}</Link>}
      >
        {supplements.length
          ? supplements.map((s) => (
              <ListRow key={s.id} icon={<Pill className="size-[1.125rem]" />} title={s.name}
                subtitle={s.inMeals ? `${ts("legendMeals")} · ${s.dose}` : s.dose} />
            ))
          : <ListRow icon={<Pill className="size-[1.125rem]" />} title={ts("none")} />}
      </ListGroup>

      <details className="list-group group/g">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
          <span className="grid size-8 place-items-center rounded-lg bg-surface-3" aria-hidden><ShoppingBasket className="size-[1.125rem]" /></span>
          <span className="flex-1 font-medium">{t("grocery")}</span>
          <ChevronDown className="size-4 text-subtle transition-transform group-open/g:rotate-180" aria-hidden />
        </summary>
        <ul className="divide-y divide-line border-t border-line">
          {grocery.map((g) => (
            <li key={g.foodId} className="flex min-h-11 items-center justify-between px-4 text-[0.9375rem]">
              <span dir="auto">{g.food}</span>
              <span className="text-muted tnum">{g.grams >= 1000 ? `${format.number(g.grams / 1000, { maximumFractionDigits: 1 })} kg` : `${g.grams} g`}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
