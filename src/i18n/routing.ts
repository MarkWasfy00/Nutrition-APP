import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar-EG", "en"],
  defaultLocale: "ar-EG",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

export const isRtl = (locale: string) => locale.startsWith("ar");
