"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { setLocale } from "@/actions/profile";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const next = locale === "en" ? "ar-EG" : "en";

  return (
    <button
      type="button"
      disabled={pending}
      lang={next}
      onClick={() =>
        start(async () => {
          await setLocale(next);
          router.replace(`${pathname}${window.location.search}`, { locale: next });
        })
      }
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      aria-label={t("switchLanguage")}
    >
      <Globe className="size-4" aria-hidden />
      {next === "en" ? "English" : "العربية"}
    </button>
  );
}
