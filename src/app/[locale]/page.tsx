import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarCheck, Check, Dumbbell, Languages, ScanLine, Target, UtensilsCrossed } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Brand } from "@/components/Brand";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ProgressBar, Ring } from "@/components/ui/Progress";
import { priceCents } from "@/lib/payments/paymob";

const FEATURES = [
  { key: "inbody", Icon: ScanLine },
  { key: "plan", Icon: UtensilsCrossed },
  { key: "train", Icon: Dumbbell },
  { key: "track", Icon: Target },
  { key: "checkin", Icon: CalendarCheck },
  { key: "lang", Icon: Languages },
] as const;

export default async function Landing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tt, format] = await Promise.all([getTranslations("landing"), getTranslations("today"), getFormatter()]);
  const price = format.number(priceCents() / 100, { style: "currency", currency: "EGP", maximumFractionDigits: 0 });

  return (
    <div className="mx-auto max-w-5xl px-5 pt-[env(safe-area-inset-top)]">
      <header className="flex h-16 items-center justify-between">
        <Brand />
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <Link href="/login" className="btn-plain">{t("login")}</Link>
        </div>
      </header>

      <main id="main">
        <section className="grid items-center gap-12 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div>
            <p className="caption text-accent">{t("kicker")}</p>
            <h1 className="mt-3 text-[2.5rem] font-bold leading-[1.08] tracking-tight md:text-[3.5rem]">
              {t("headline1")} <span className="text-accent">{t("headline2")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">{t("sub")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/register" className="btn-primary btn-lg px-7">{t("cta")}</Link>
              <p className="footnote text-[0.9375rem]">{t("price", { price })}</p>
            </div>
          </div>

          {/* Product preview built from the real app components (illustrative numbers). */}
          <div aria-hidden className="mx-auto w-full max-w-[20rem] rounded-[2.5rem] bg-surface p-3 ring-1 ring-line">
            <div className="space-y-3 rounded-[2rem] bg-bg p-4">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">{tt("title")}</span>
                <span className="pill bg-tonal text-accent">{tt("dayType.TRAINING")}</span>
              </div>
              <div className="card flex items-center gap-4 p-3.5">
                <Ring value={1240} max={2810} size={96} stroke={8}>
                  <div><p className="text-lg font-bold leading-none tnum">{format.number(1570)}</p><p className="mt-0.5 text-[0.625rem] text-muted">{tt("kcalLeft")}</p></div>
                </Ring>
                <div className="flex-1 space-y-2.5">
                  {([["protein", 0.62, "var(--color-protein)"], ["carbs", 0.38, "var(--color-carbs)"], ["fat", 0.45, "var(--color-fat)"]] as const).map(([k, v, c]) => (
                    <div key={k}>
                      <p className="mb-1 text-[0.6875rem] font-medium">{tt(k)}</p>
                      <ProgressBar value={v} max={1} color={c} label="" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="list-group divide-y divide-line">
                {(["BREAKFAST", "LUNCH"] as const).map((s, i) => (
                  <div key={s} className="flex items-center gap-3 px-3.5 py-3">
                    <span className={`grid size-5 place-items-center rounded-full border-2 ${i === 0 ? "border-ok bg-ok text-bg" : "border-subtle"}`}>
                      {i === 0 && <Check className="size-3" strokeWidth={3.5} />}
                    </span>
                    <span className="flex-1 text-sm font-medium">{tt(`slots.${s}`)}</span>
                    <span className="text-xs text-muted tnum">{i === 0 ? "620" : "910"} kcal</span>
                  </div>
                ))}
              </div>
              <div className="card flex items-center gap-3 p-3.5">
                <span className="grid size-8 place-items-center rounded-lg bg-surface-3"><Dumbbell className="size-4" /></span>
                <span className="flex-1 text-sm font-medium">{tt("todaysWorkout")}</span>
                <span className="text-sm font-semibold text-accent">{tt("start")}</span>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="features" className="border-t border-line py-14">
          <h2 id="features" className="title">{t("featuresTitle")}</h2>
          <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ key, Icon }) => (
              <li key={key} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-accent"><Icon className="size-5" aria-hidden /></span>
                <div>
                  <h3 className="headline">{t(`f.${key}.title`)}</h3>
                  <p className="footnote mt-1 text-[0.9375rem] leading-relaxed">{t(`f.${key}.body`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14 flex flex-col items-start justify-between gap-6 rounded-3xl bg-surface p-8 md:flex-row md:items-center">
          <div>
            <h2 className="title">{t("ctaTitle")}</h2>
            <p className="footnote mt-1 text-[0.9375rem]">{t("price", { price })}</p>
          </div>
          <Link href="/register" className="btn-primary btn-lg px-7">{t("cta")}</Link>
        </section>
      </main>

      <footer className="footnote border-t border-line py-8">{t("disclaimer")}</footer>
    </div>
  );
}
