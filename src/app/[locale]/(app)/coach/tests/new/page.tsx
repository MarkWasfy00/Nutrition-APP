import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { managedAthlete, requireCoach } from "@/lib/auth/guards";
import { addDays, today } from "@/lib/dates";
import { SCHEDULE_WINDOW } from "@/lib/schedule";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssignmentForm } from "@/components/biomotor/AssignmentForm";

/** Coach assigns tests to the whole team or one athlete (`?athlete=` preselects one). */
export default async function NewTestAssignmentPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ athlete?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user, team } = await requireCoach(locale);
  const t = await getTranslations("biomotor");
  const preset = (await searchParams).athlete;
  const [athletes, chosen] = await Promise.all([
    db.user.findMany({ where: { teamId: team.id, role: "ATHLETE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    preset ? managedAthlete(user, preset) : null,
  ]);
  const day = today();
  return (
    <div>
      <PageHeader back={{ href: chosen ? `/coach/athletes/${chosen.id}/tests` : "/coach/tests", label: chosen ? chosen.name : t("title") }} title={t("newTitle")} />
      <AssignmentForm
        assignmentId={null}
        athletes={athletes}
        minDay={addDays(day, -SCHEDULE_WINDOW.pastDays)}
        maxDay={addDays(day, SCHEDULE_WINDOW.futureDays)}
        values={{ title: null, day, tests: [], notes: null, athleteId: chosen?.id ?? null }}
      />
    </div>
  );
}
