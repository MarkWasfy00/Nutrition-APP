import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Brand } from "@/components/Brand";
import { BottomNav } from "@/components/BottomNav";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

// Every page here depends on the signed-in user.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  // Keep the saved language in sync with the one in use (redirects, emails and AI text follow it).
  if (user.locale !== locale) await db.user.update({ where: { id: user.id }, data: { locale } });
  const t = await getTranslations("common");
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-lg focus:bg-surface-2 focus:px-4 focus:py-2">
        {t("skip")}
      </a>
      <header className="sticky top-0 z-30 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Brand href={user.role === "COACH" ? "/coach" : "/today"} />
          <LocaleSwitcher />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-lg px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-2">{children}</main>
      <BottomNav role={user.role} />
    </>
  );
}
