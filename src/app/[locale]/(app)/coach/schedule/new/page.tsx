import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { managedAthlete, requireCoach } from "@/lib/auth/guards";
import { addDays, today } from "@/lib/dates";
import { SCHEDULE_WINDOW } from "@/lib/schedule";
import { PageHeader } from "@/components/ui/PageHeader";
import { SessionForm } from "@/components/schedule/SessionForm";

/** Coach adds a session for the whole team or one athlete (`?athlete=` preselects one). */
export default async function NewCoachSessionPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ athlete?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user, team } = await requireCoach(locale);
  const t = await getTranslations("schedule");
  const preset = (await searchParams).athlete;
  const [athletes, chosen] = await Promise.all([
    db.user.findMany({ where: { teamId: team.id, role: "ATHLETE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    preset ? managedAthlete(user, preset) : null,
  ]);
  const day = today();
  return (
    <div>
      <PageHeader back={{ href: chosen ? `/coach/athletes/${chosen.id}` : "/coach/schedule", label: chosen ? chosen.name : t("title") }} title={t("newTitle")} />
      <SessionForm
        sessionId={null}
        athletes={athletes}
        minDay={addDays(day, -SCHEDULE_WINDOW.pastDays)}
        maxDay={addDays(day, SCHEDULE_WINDOW.futureDays)}
        values={{ kind: "PRACTICE", title: null, day, startTime: "18:00", durationMin: 90, location: null, notes: null, athleteId: chosen?.id ?? null }}
      />
    </div>
  );
}
