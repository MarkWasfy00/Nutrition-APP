import { getTranslations, setRequestLocale } from "next-intl/server";
import { Printer } from "lucide-react";
import { db } from "@/lib/db";
import { requirePaidUser } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { canRecord } from "@/lib/biomotor";
import { athleteSessionsWhere } from "@/lib/schedule";
import { PrintButton } from "@/components/PrintButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssignmentList, type AssignmentItem } from "@/components/biomotor/AssignmentList";
import { AthleteReport } from "@/components/biomotor/AthleteReport";

/** Athlete: tests their coach assigned (upcoming and recent) and their own biomotor report. */
export default async function TestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await requirePaidUser(locale);
  const teamId = user.teamId!;
  const t = await getTranslations("biomotor");
  const day = today();
  // Same audience rule as sessions: the whole team's plus the athlete's own.
  const where = athleteSessionsWhere({ id: user.id, teamId });
  const include = { results: { where: { athleteId: user.id }, select: { id: true } } };

  const [upcoming, past] = await Promise.all([
    db.biomotorAssignment.findMany({ where: { ...where, day: { gte: day } }, orderBy: [{ day: "asc" }, { createdAt: "asc" }], take: 20, include }),
    db.biomotorAssignment.findMany({ where: { ...where, day: { lt: day } }, orderBy: [{ day: "desc" }, { createdAt: "desc" }], take: 20, include }),
  ]);
  const item = (a: (typeof upcoming)[number]): AssignmentItem => {
    const done = a.results.length;
    return {
      ...a,
      who: a.athleteId ? t("personal") : t("wholeTeam"),
      href: `/tests/${a.id}`,
      badge: !canRecord(a, day) ? undefined
        : done === 0 ? { label: t("toDo"), tone: "accent" }
        : done >= a.tests.length ? { label: t("done"), tone: "ok" }
        : { label: t("progress", { done, total: a.tests.length }), tone: "muted" },
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} action={<PrintButton label={t("print")} icon={<Printer className="size-5" aria-hidden />} />} />
      <section className="no-print">
        <h2 className="section-label">{t("upcoming")}</h2>
        <AssignmentList items={upcoming.map(item)} empty={t("emptyUpcoming")} />
      </section>
      <AthleteReport athleteId={user.id} teamId={teamId} empty={t("noReport")} />
      {past.length > 0 && (
        <section className="no-print">
          <h2 className="section-label">{t("past")}</h2>
          <AssignmentList items={past.map(item)} empty={t("emptyPast")} />
        </section>
      )}
    </div>
  );
}
