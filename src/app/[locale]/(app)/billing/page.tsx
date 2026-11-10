import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Check, CheckCircle2, CreditCard, Lock, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { hasAccess, paymentsDisabled } from "@/lib/subscription";
import { paymobEnabled, priceCents } from "@/lib/payments/paymob";
import { cancelSubscription, resumeSubscription } from "@/actions/billing";
import { CheckoutForm } from "@/components/forms/BillingForms";
import { SubmitButton } from "@/components/SubmitButton";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListGroup, ListRow } from "@/components/ui/List";

export default async function BillingPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const { status } = await searchParams;
  const [t, format] = await Promise.all([getTranslations("billing"), getFormatter()]);
  const [sub, payments, profile, plan] = await Promise.all([
    db.subscription.findUnique({ where: { userId: user.id } }),
    db.payment.findMany({ where: { userId: user.id, status: { not: "PENDING" } }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.athleteProfile.findUnique({ where: { userId: user.id } }),
    db.nutritionPlan.findFirst({ where: { userId: user.id, status: "ACTIVE" } }),
  ]);
  const active = hasAccess(sub);
  const date = (d: Date | null | undefined) => (d ? format.dateTime(d, { dateStyle: "medium" }) : "—");
  const money = (cents: number) => format.number(cents / 100, { style: "currency", currency: "EGP", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} back={profile ? { href: "/settings", label: t("back") } : undefined} />

      {status === "success" && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-5" aria-hidden />{t("success")}
        </p>
      )}
      {status === "failed" && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl bg-tonal px-4 py-3 text-sm font-medium text-accent">
          <XCircle className="size-5" aria-hidden />{t("failed")}
        </p>
      )}

      {paymentsDisabled() ? (
        <div className="card space-y-4">
          <p className="flex items-center gap-2 font-medium text-ok"><CheckCircle2 className="size-5" aria-hidden />{t("demoMode")}</p>
          {!profile ? <Link href="/onboarding" className="btn-primary w-full">{t("continueSetup")}</Link>
            : !plan ? <Link href="/inbody/new" className="btn-primary w-full">{t("addInbody")}</Link>
            : <Link href="/today" className="btn-secondary w-full">{t("goToday")}</Link>}
        </div>
      ) : active && sub ? (
        <>
          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="headline text-lg">{t("monthly")}</p>
                <p className="footnote mt-0.5">
                  {sub.status === "CANCELED" ? t("endsOn", { date: date(sub.currentPeriodEnd) })
                    : sub.status === "PAST_DUE" ? t("graceUntil", { date: date(sub.graceUntil) })
                    : t("renewsOn", { date: date(sub.currentPeriodEnd) })}
                </p>
              </div>
              <span className={`pill ${sub.status === "ACTIVE" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>{t(`status.${sub.status}`)}</span>
            </div>
            {!profile ? <Link href="/onboarding" className="btn-primary w-full">{t("continueSetup")}</Link>
              : !plan ? <Link href="/inbody/new" className="btn-primary w-full">{t("addInbody")}</Link>
              : <Link href="/today" className="btn-secondary w-full">{t("goToday")}</Link>}
            {sub.status === "PAST_DUE" && <CheckoutForm phone={user.phone} />}
          </div>
          {sub.cardMaskedPan && (
            <ListGroup><ListRow icon={<CreditCard className="size-[1.125rem]" />} title={t("card", { pan: sub.cardMaskedPan })} /></ListGroup>
          )}
          {(sub.status === "ACTIVE" || sub.status === "CANCELED") && (
            <form action={sub.status === "ACTIVE" ? cancelSubscription : resumeSubscription} className="list-group">
              <SubmitButton className={`flex min-h-[3.25rem] w-full items-center px-4 text-start font-medium hover:bg-surface-2 ${sub.status === "ACTIVE" ? "text-accent" : "text-ok"}`}>
                {sub.status === "ACTIVE" ? t("cancel") : t("resume")}
              </SubmitButton>
            </form>
          )}
        </>
      ) : (
        <div className="card space-y-5">
          <div>
            <p className="caption">{t("monthly")}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tracking-tight tnum">{money(priceCents())}</span>
              <span className="text-muted">{t("perMonth")}</span>
            </p>
          </div>
          <ul className="space-y-2.5">
            {(["f1", "f2", "f3", "f4", "f5"] as const).map((k) => (
              <li key={k} className="flex gap-3 text-[0.9375rem]">
                <Check className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />{t(`features.${k}`)}
              </li>
            ))}
          </ul>
          <CheckoutForm phone={user.phone} />
          {!paymobEnabled() && <p className="footnote rounded-xl bg-warn/10 p-3 text-warn">{t("devMode")}</p>}
          <p className="footnote flex items-center justify-center gap-1.5"><Lock className="size-3.5" aria-hidden />{t("secure")}</p>
        </div>
      )}

      {payments.length > 0 && (
        <ListGroup title={t("invoices")}>
          {payments.map((p) => (
            <ListRow key={p.id} title={date(p.createdAt)} subtitle={t(`paymentStatus.${p.status}`)} value={money(p.amountCents)} />
          ))}
        </ListGroup>
      )}
    </div>
  );
}
