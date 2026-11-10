import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle, CalendarCheck, CircleUser, RefreshCw, ScanLine, ShieldCheck, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireCoach } from "@/lib/auth/guards";
import { hasAccess, paymentsDisabled } from "@/lib/subscription";
import { athleteStatus, weeklyWeightChange, type AthleteStatus } from "@/lib/coach";
import { resetInviteCode } from "@/actions/coach";
import { Link } from "@/i18n/navigation";
import { CopyInviteLink } from "@/components/CopyLink";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListGroup, ListRow } from "@/components/ui/List";

const ICON: Record<AthleteStatus["kind"], typeof Users> = {
  ONBOARDING: CircleUser, CONSENT: ShieldCheck, SCAN: ScanLine, CHECKIN_DUE: CalendarCheck, ON_PLAN: CalendarCheck,
};

/** Coach dashboard: team, seats, invite link and every athlete's status. */
export default async function CoachPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { team } = await requireCoach(locale);
  const [t, ts, tt, format] = await Promise.all([
    getTranslations("coach"), getTranslations("sports"), getTranslations("train"), getFormatter(),
  ]);
  const [sub, athletes] = await Promise.all([
    db.subscription.findUnique({ where: { teamId: team.id } }),
    db.user.findMany({
      where: { teamId: team.id, role: "ATHLETE" },
      orderBy: { name: "asc" },
      include: {
        profile: { select: { birthDate: true, consentConfirmedAt: true } },
        plans: {
          where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1,
          include: { scan: { select: { weightKg: true } }, checkIns: { select: { weekNumber: true, bodyWeightKg: true, adherence: true } } },
        },
      },
    }),
  ]);
  const active = paymentsDisabled() || hasAccess(sub);
  const rows = athletes.map((a) => {
    const plan = a.plans[0] ?? null;
    const status = athleteStatus({ profile: a.profile, plan: plan && { startDay: plan.startDay, checkInWeeks: plan.checkIns.map((c) => c.weekNumber) } });
    const change = plan ? weeklyWeightChange(plan.scan.weightKg, plan.checkIns) : null;
    const adherence = plan?.checkIns.length ? plan.checkIns.reduce((s, c) => s + c.adherence, 0) / plan.checkIns.length : null;
    return { a, status, change, adherence };
  });
  const attention = rows.filter((r) => r.status.kind !== "ON_PLAN").length;
  const num = (v: number) => format.number(v, { maximumFractionDigits: 1, signDisplay: "exceptZero" });

  return (
    <div className="space-y-6">
      <PageHeader title={team.name} subtitle={`${ts.has(team.sport) ? ts(team.sport) : team.sport} · ${tt(`phases.${team.phase}`)}`} />

      {!active && (
        <Link href="/billing" className="flex min-h-14 items-center gap-3 rounded-2xl bg-tonal px-4 text-accent">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <span className="flex-1 font-semibold">{t("inactive")}</span>
          <span className="text-sm font-semibold">{t("subscribe")}</span>
        </Link>
      )}

      <dl className="grid grid-cols-2 gap-3">
        <div className="card px-3.5">
          <dt className="caption">{t("athletes")}</dt>
          <dd className="mt-1 text-xl font-bold tnum">
            {format.number(athletes.length)}
            {!paymentsDisabled() && <span className="ms-1 text-sm font-normal text-muted">/ {format.number(team.seats)} {t("seats")}</span>}
          </dd>
        </div>
        <div className="card px-3.5">
          <dt className="caption">{t("needAttention")}</dt>
          <dd className={`mt-1 text-xl font-bold tnum ${attention ? "text-warn" : ""}`}>{format.number(attention)}</dd>
        </div>
      </dl>

      <section className="card space-y-3">
        <h2 className="headline">{t("inviteTitle")}</h2>
        <p className="footnote">{t("inviteBody")}</p>
        <CopyInviteLink code={team.inviteCode} />
        <form action={resetInviteCode}>
          <SubmitButton className="footnote inline-flex min-h-10 items-center gap-1.5 font-medium text-accent">
            <RefreshCw className="size-4" aria-hidden />{t("resetInvite")}
          </SubmitButton>
        </form>
      </section>

      {rows.length === 0 ? (
        <div className="card py-10 text-center">
          <Users className="mx-auto size-8 text-subtle" aria-hidden />
          <p className="footnote mt-3">{t("noAthletes")}</p>
        </div>
      ) : (
        <ListGroup title={t("athletes")}>
          {rows.map(({ a, status, change, adherence }) => {
            const Icon = ICON[status.kind];
            const details = [
              t(`status.${status.kind}`, { week: "week" in status ? status.week : 0 }),
              change != null ? t("perWeek", { kg: num(change) }) : null,
              adherence != null ? t("adherence", { n: format.number(adherence, { maximumFractionDigits: 1 }) }) : null,
            ].filter(Boolean).join(" · ");
            return (
              <ListRow key={a.id} href={`/coach/athletes/${a.id}`} icon={<Icon className={`size-[1.125rem] ${status.kind === "ON_PLAN" ? "" : "text-warn"}`} />}
                title={a.name} subtitle={details} />
            );
          })}
        </ListGroup>
      )}
    </div>
  );
}
