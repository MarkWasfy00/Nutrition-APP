"use client";

import { useTranslations } from "next-intl";
import { CalendarClock, CalendarDays, ChartLine, CircleUser, CreditCard, Dumbbell, House, Users, UtensilsCrossed } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

type Item = { href: string; key: string; Icon: typeof House; also?: string[]; exact?: boolean };

const ATHLETE: Item[] = [
  { href: "/today", key: "today", Icon: House },
  { href: "/plan", key: "plan", Icon: UtensilsCrossed },
  { href: "/train", key: "train", Icon: Dumbbell, also: ["/schedule", "/tests"] },
  { href: "/progress", key: "progress", Icon: ChartLine },
  { href: "/settings", key: "account", Icon: CircleUser, also: ["/onboarding"] },
];

const COACH: Item[] = [
  { href: "/coach", key: "athletes", Icon: Users, also: ["/coach/athletes", "/coach/tests"], exact: true },
  { href: "/coach/schedule", key: "schedule", Icon: CalendarClock },
  { href: "/coach/team", key: "team", Icon: CalendarDays },
  { href: "/billing", key: "billing", Icon: CreditCard },
  { href: "/settings", key: "account", Icon: CircleUser },
];

export function BottomNav({ role }: { role: "COACH" | "ATHLETE" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = role === "COACH" ? COACH : ATHLETE;
  return (
    <nav aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className={`mx-auto grid max-w-lg ${items.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
        {items.map(({ href, key, Icon, also = [], exact }) => {
          const active = (exact ? pathname === href : pathname.startsWith(href)) || also.some((p) => pathname.startsWith(p));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium transition-colors ${active ? "text-accent" : "text-muted hover:text-fg"}`}
              >
                <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
