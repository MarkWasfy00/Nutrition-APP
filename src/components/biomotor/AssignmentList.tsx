import { getFormatter, getTranslations } from "next-intl/server";
import { ChevronRight, ClipboardList } from "lucide-react";
import { today } from "@/lib/dates";
import { Link } from "@/i18n/navigation";

export type AssignmentItem = {
  id: string; day: string; title: string | null; tests: string[];
  /** "Whole team", an athlete's name, "Just you"... */
  who: string;
  badge?: { label: string; tone: "ok" | "muted" | "accent" };
  href: string;
};

const TONE = { ok: "bg-ok/15 text-ok", muted: "bg-surface-2 text-muted", accent: "bg-tonal text-accent" };

/** Testing assignments, one row each, in the given order. */
export async function AssignmentList({ items, empty }: { items: AssignmentItem[]; empty: string }) {
  const [t, format] = await Promise.all([getTranslations("biomotor"), getFormatter()]);
  if (items.length === 0) return <p className="footnote rounded-2xl bg-surface px-4 py-3">{empty}</p>;
  const now = today();
  const dayLabel = (d: string) =>
    `${format.dateTime(new Date(`${d}T12:00:00Z`), { weekday: "short", day: "numeric", month: "short" })}${d === now ? ` · ${t("todayLabel")}` : ""}`;

  return (
    <ul className="list-group divide-y divide-line">
      {items.map((i) => (
        <li key={i.id}>
          <Link href={i.href} className="flex min-h-[3.75rem] w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-surface-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3" aria-hidden><ClipboardList className="size-[1.125rem]" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] font-medium">{i.title || t("title")}</span>
              <span className="footnote block truncate">{[dayLabel(i.day), t("testCount", { n: i.tests.length }), i.who].join(" · ")}</span>
            </span>
            {i.badge && <span className={`pill shrink-0 ${TONE[i.badge.tone]}`}>{i.badge.label}</span>}
            <ChevronRight className="size-4 shrink-0 text-subtle rtl:rotate-180" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
