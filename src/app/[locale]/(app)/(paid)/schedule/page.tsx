import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requirePaidUser } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { athleteSessionsWhere, attendanceRate } from "@/lib/schedule";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { SessionList, type SessionItem } from "@/components/schedule/SessionList";

/** Athlete's schedule: team sessions plus their own, with the attendance their coach recorded. */
export default async function SchedulePage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ view?: string; saved?: string; deleted?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user } = await requirePaidUser(locale);
  const sp = await searchParams;
  const past = sp.view === "past";
  const [t, format] = await Promise.all([getTranslations("schedule"), getFormatter()]);
  const day = today();
  const where = athleteSessionsWhere({ id: user.id, teamId: user.teamId! });

  const [sessions, records] = await Promise.all([
    db.teamSession.findMany({
      where: { ...where, day: past ? { lt: day } : { gte: day } },
      orderBy: past ? [{ day: "desc" }, { startTime: "desc" }] : [{ day: "asc" }, { startTime: "asc" }],
      take: 100,
      include: { attendance: { where: { athleteId: user.id }, select: { status: true } } },
    }),
    db.attendance.findMany({ where: { athleteId: user.id, session: { teamId: user.teamId! } }, select: { status: true } }),
  ]);
  const rate = attendanceRate(records);
  const present = records.filter((r) => r.status === "PRESENT").length;

  const items: SessionItem[] = sessions.map((s) => {
    const mark = s.attendance[0]?.status;
    const editable = s.createdById === user.id && s.athleteId === user.id && !mark;
    return {
      ...s,
      who: s.athleteId ? t("personal") : t("wholeTeam"),
      href: editable ? `/schedule/${s.id}/edit` : undefined,
      badge: mark === "PRESENT" ? { label: t("present"), tone: "ok" }
        : mark === "ABSENT" ? { label: t("absent"), tone: "bad" }
        : s.day < day ? { label: t("notMarked"), tone: "muted" } : undefined,
    };
  });
  const notice = sp.saved ? t("saved") : sp.deleted ? t("deleted") : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={rate != null ? t("rateLine", { rate: format.number(rate), present, total: records.length }) : t("noRecords")}
        action={<Link href="/schedule/new" className="icon-btn bg-surface text-accent" aria-label={t("add")}><Plus className="size-5" aria-hidden /></Link>}
      />
      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-5" aria-hidden />{notice}
        </p>
      )}
      <Segmented label={t("views")} items={[
        { href: "/schedule", label: t("upcoming"), active: !past },
        { href: "/schedule?view=past", label: t("past"), active: past },
      ]} />
      <SessionList items={items} empty={past ? t("emptyPast") : t("emptyUpcoming")} />
      {!past && <Link href="/schedule/new" className="btn-tonal w-full"><Plus className="size-5" aria-hidden />{t("addOwn")}</Link>}
      <p className="footnote px-1">{t("athleteHint")}</p>
    </div>
  );
}
