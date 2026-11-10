"use client";

import { useTranslations } from "next-intl";
import { ChartLine, CircleUser, Dumbbell, House, UtensilsCrossed } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { href: "/today", key: "today", Icon: House },
  { href: "/plan", key: "plan", Icon: UtensilsCrossed },
  { href: "/train", key: "train", Icon: Dumbbell },
  { href: "/progress", key: "progress", Icon: ChartLine },
  { href: "/settings", key: "account", Icon: CircleUser, also: ["/billing", "/onboarding"] },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map(({ href, key, Icon, ...rest }) => {
          const active = [href, ...("also" in rest ? rest.also : [])].some((p) => pathname.startsWith(p));
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
