import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireCoach } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { canRecord } from "@/lib/biomotor";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { AssignmentList, type AssignmentItem } from "@/components/biomotor/AssignmentList";

/** Coach: biomotor testing assignments, upcoming or past, with how many results are in. */
export default async function CoachTestsPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ view?: string; deleted?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { team } = await requireCoach(locale);
  const sp = await searchParams;
  const past = sp.view === "past";
  const t = await getTranslations("biomotor");
  const day = today();

  const [assignments, athletes] = await Promise.all([
    db.biomotorAssignment.findMany({
      where: { teamId: team.id, day: past ? { lt: day } : { gte: day } },
      orderBy: past ? [{ day: "desc" }, { createdAt: "desc" }] : [{ day: "asc" }, { createdAt: "asc" }],
      take: 100,
      include: { athlete: { select: { name: true } }, results: { select: { athleteId: true } } },
    }),
    db.user.findMany({ where: { teamId: team.id, role: "ATHLETE" }, select: { id: true } }),
  ]);
  const squad = new Set(athletes.map((a) => a.id));

  const items: AssignmentItem[] = assignments.map((a) => {
    const total = (a.athleteId ? 1 : squad.size) * a.tests.length;
    const done = a.results.filter((r) => squad.has(r.athleteId)).length;
    return {
      ...a,
      who: a.athlete ? a.athlete.name : t("wholeTeam"),
      href: `/coach/tests/${a.id}`,
      badge: !canRecord(a, day) || total === 0 ? undefined
        : done === 0 ? { label: t("toDo"), tone: "accent" }
        : { label: t("progress", { done, total }), tone: done >= total ? "ok" : "muted" },
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/coach", label: team.name }}
        title={t("title")}
        action={<Link href="/coach/tests/new" className="icon-btn bg-surface text-accent" aria-label={t("add")}><Plus className="size-5" aria-hidden /></Link>}
      />
      {sp.deleted && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-5" aria-hidden />{t("deleted")}
        </p>
      )}
      <Segmented label={t("views")} items={[
        { href: "/coach/tests", label: t("upcoming"), active: !past },
        { href: "/coach/tests?view=past", label: t("past"), active: past },
      ]} />
      <AssignmentList items={items} empty={past ? t("emptyPast") : t("emptyUpcoming")} />
      {!past && <Link href="/coach/tests/new" className="btn-tonal w-full"><Plus className="size-5" aria-hidden />{t("add")}</Link>}
    </div>
  );
}
