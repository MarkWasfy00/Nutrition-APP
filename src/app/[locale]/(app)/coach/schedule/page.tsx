import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireCoach } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { attendanceSummary, canTakeAttendance } from "@/lib/schedule";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { SessionList, type SessionItem } from "@/components/schedule/SessionList";

/** Team schedule for the coach: upcoming or past sessions, with attendance status. */
export default async function CoachSchedulePage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ view?: string; saved?: string; deleted?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { team } = await requireCoach(locale);
  const sp = await searchParams;
  const past = sp.view === "past";
  const t = await getTranslations("schedule");
  const day = today();

  const [sessions, teamSize] = await Promise.all([
    db.teamSession.findMany({
      where: { teamId: team.id, day: past ? { lt: day } : { gte: day } },
      orderBy: past ? [{ day: "desc" }, { startTime: "desc" }] : [{ day: "asc" }, { startTime: "asc" }],
      take: 100,
      include: { athlete: { select: { name: true } }, attendance: { select: { status: true } } },
    }),
    db.user.count({ where: { teamId: team.id, role: "ATHLETE" } }),
  ]);

  const items: SessionItem[] = sessions.map((s) => {
    const sum = attendanceSummary(s.athleteId ? 1 : teamSize, s.attendance);
    const open = canTakeAttendance(s, day);
    return {
      ...s,
      who: s.athlete ? s.athlete.name : t("wholeTeam"),
      href: `/coach/schedule/${s.id}`,
      badge: !open ? undefined
        : s.attendance.length === 0 ? { label: t("takeAttendance"), tone: "accent" }
        : { label: t("presentOf", { present: sum.present, expected: sum.expected }), tone: sum.unmarked ? "muted" : "ok" },
    };
  });
  const notice = sp.saved ? t("saved") : sp.deleted ? t("deleted") : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        action={<Link href="/coach/schedule/new" className="icon-btn bg-surface text-accent" aria-label={t("add")}><Plus className="size-5" aria-hidden /></Link>}
      />
      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-5" aria-hidden />{notice}
        </p>
      )}
      <Segmented label={t("views")} items={[
        { href: "/coach/schedule", label: t("upcoming"), active: !past },
        { href: "/coach/schedule?view=past", label: t("past"), active: past },
      ]} />
      <SessionList items={items} empty={past ? t("emptyPast") : t("emptyUpcoming")} />
      {!past && <Link href="/coach/schedule/new" className="btn-tonal w-full"><Plus className="size-5" aria-hidden />{t("add")}</Link>}
    </div>
  );
}
