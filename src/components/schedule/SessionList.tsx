import { getFormatter, getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import type { SessionKind } from "@prisma/client";
import { endTime } from "@/lib/schedule";
import { today } from "@/lib/dates";
import { Link } from "@/i18n/navigation";

export type SessionItem = {
  id: string; day: string; kind: SessionKind; title: string | null; startTime: string; durationMin: number;
  location: string | null; notes?: string | null;
  /** "Whole team", an athlete's name, "Personal"... */
  who?: string;
  badge?: { label: string; tone: "ok" | "bad" | "muted" | "accent" };
  href?: string;
};

const TONE = { ok: "bg-ok/15 text-ok", bad: "bg-primary/20 text-accent", muted: "bg-surface-2 text-muted", accent: "bg-tonal text-accent" };

/** Sessions grouped by day (in the given order). */
export async function SessionList({ items, empty }: { items: SessionItem[]; empty: string }) {
  const [t, format] = await Promise.all([getTranslations("schedule"), getFormatter()]);
  if (items.length === 0) return <p className="footnote rounded-2xl bg-surface px-4 py-3">{empty}</p>;
  const days = [...new Set(items.map((i) => i.day))];
  const now = today();
  const dayLabel = (d: string) =>
    `${format.dateTime(new Date(`${d}T12:00:00Z`), { weekday: "long", day: "numeric", month: "short" })}${d === now ? ` · ${t("todayLabel")}` : ""}`;

  return (
    <div className="space-y-5">
      {days.map((d) => (
        <section key={d}>
          <h2 className="section-label">{dayLabel(d)}</h2>
          <ul className="list-group divide-y divide-line">
            {items.filter((i) => i.day === d).map((i) => {
              const body = (
                <>
                  <span className="w-[4.5rem] shrink-0 text-sm font-semibold tnum" dir="ltr">
                    {i.startTime}<span className="block text-xs font-normal text-muted">{endTime(i.startTime, i.durationMin)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium">{i.title || t(`kinds.${i.kind}`)}</span>
                    <span className="footnote block truncate">
                      {[i.title ? t(`kinds.${i.kind}`) : null, i.location, i.who].filter(Boolean).join(" · ")}
                    </span>
                    {i.notes && <span className="footnote mt-0.5 block line-clamp-2" dir="auto">{i.notes}</span>}
                  </span>
                  {i.badge && <span className={`pill shrink-0 ${TONE[i.badge.tone]}`}>{i.badge.label}</span>}
                  {i.href && <ChevronRight className="size-4 shrink-0 text-subtle rtl:rotate-180" aria-hidden />}
                </>
              );
              const cls = "flex min-h-[3.75rem] w-full items-center gap-3 px-4 py-2.5 text-start";
              return (
                <li key={i.id}>
                  {i.href ? <Link href={i.href} className={`${cls} transition-colors hover:bg-surface-2`}>{body}</Link> : <div className={cls}>{body}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
