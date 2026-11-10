import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Check, CheckCircle2, CreditCard, Lock, Users, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireCoach } from "@/lib/auth/guards";
import { hasAccess, paymentsDisabled } from "@/lib/subscription";
import { paymobEnabled, priceCents } from "@/lib/payments/paymob";
import { cancelSubscription, resumeSubscription } from "@/actions/billing";
import { BuySeatsForm, CheckoutForm, RenewalSeatsForm } from "@/components/forms/BillingForms";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListGroup, ListRow } from "@/components/ui/List";

const DAY = 86_400_000;

/** Team subscription: per athlete seat, managed by the team's coaches. */
export default async function BillingPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user, team } = await requireCoach(locale);
  const { status } = await searchParams;
  const [t, format] = await Promise.all([getTranslations("billing"), getFormatter()]);
  const [sub, payments, athletes] = await Promise.all([
    db.subscription.findUnique({ where: { teamId: team.id } }),
    db.payment.findMany({ where: { teamId: team.id, status: { not: "PENDING" } }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.user.count({ where: { teamId: team.id, role: "ATHLETE" } }),
  ]);
  const active = hasAccess(sub);
  const date = (d: Date | null | undefined) => (d ? format.dateTime(d, { dateStyle: "medium" }) : "—");
  const money = (cents: number) => format.number(cents / 100, { style: "currency", currency: "EGP", maximumFractionDigits: 0 });
  const daysLeft = sub?.currentPeriodEnd ? Math.max(1, Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / DAY)) : 30;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={team.name} />

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
        <div className="card space-y-2">
          <p className="flex items-center gap-2 font-medium text-ok"><CheckCircle2 className="size-5" aria-hidden />{t("demoMode")}</p>
          <p className="footnote">{t("seatsUsedUnlimited", { athletes })}</p>
        </div>
      ) : active && sub ? (
        <>
          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="headline text-lg">{t("teamPlan")}</p>
                <p className="footnote mt-0.5">
                  {sub.status === "CANCELED" ? t("endsOn", { date: date(sub.currentPeriodEnd) })
                    : sub.status === "PAST_DUE" ? t("graceUntil", { date: date(sub.graceUntil) })
                    : t("renewsOn", { date: date(sub.currentPeriodEnd) })}
                </p>
              </div>
              <span className={`pill ${sub.status === "ACTIVE" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>{t(`status.${sub.status}`)}</span>
            </div>
            <p className="flex items-center gap-2 text-[0.9375rem]">
              <Users className="size-5 text-accent" aria-hidden />
              <span className="tnum">{t("seatsUsed", { athletes, seats: team.seats })}</span>
            </p>
            {team.nextSeats != null && <p className="footnote">{t("nextSeats", { seats: team.nextSeats })}</p>}
            <p className="footnote tnum">{t("renewalAmount", { total: money((team.nextSeats ?? team.seats) * priceCents()) })}</p>
            {sub.status === "PAST_DUE" && <CheckoutForm phone={user.phone} pricePerSeatCents={priceCents()} minSeats={athletes} />}
          </div>

          {sub.status !== "PAST_DUE" && (
            <section className="card space-y-5">
              <BuySeatsForm phone={user.phone} pricePerSeatCents={priceCents()} daysLeft={daysLeft} />
              <div className="border-t border-line pt-5">
                <RenewalSeatsForm seats={team.seats} nextSeats={team.nextSeats} athletes={athletes} />
              </div>
            </section>
          )}

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
            <p className="caption">{t("teamPlan")}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tracking-tight tnum">{money(priceCents())}</span>
              <span className="text-muted">{t("perAthleteMonth")}</span>
            </p>
          </div>
          <ul className="space-y-2.5">
            {(["f1", "f2", "f3", "f4", "f5"] as const).map((k) => (
              <li key={k} className="flex gap-3 text-[0.9375rem]">
                <Check className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />{t(`features.${k}`)}
              </li>
            ))}
          </ul>
          <CheckoutForm phone={user.phone} pricePerSeatCents={priceCents()} minSeats={athletes} />
          {!paymobEnabled() && <p className="footnote rounded-xl bg-warn/10 p-3 text-warn">{t("devMode")}</p>}
          <p className="footnote flex items-center justify-center gap-1.5"><Lock className="size-3.5" aria-hidden />{t("secure")}</p>
        </div>
      )}

      {payments.length > 0 && (
        <ListGroup title={t("invoices")}>
          {payments.map((p) => (
            <ListRow key={p.id} title={date(p.createdAt)}
              subtitle={`${t(`paymentStatus.${p.status}`)} · ${p.isTopUp ? t("topUpSeats", { seats: p.seats }) : t("seatsCount", { seats: p.seats })}`}
              value={money(p.amountCents)} />
          ))}
        </ListGroup>
      )}
    </div>
  );
}
