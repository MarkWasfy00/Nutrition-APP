import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCoach } from "@/lib/auth/guards";
import { TeamForm } from "@/components/forms/TeamForm";
import { PageHeader } from "@/components/ui/PageHeader";

/** Team schedule: season phase, practice and match days. Drives every athlete's S&C and meal days. */
export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { team } = await requireCoach(locale);
  const t = await getTranslations("coach");
  return (
    <div className="space-y-6">
      <PageHeader title={t("teamTitle")} subtitle={t("teamSubtitle")} />
      <TeamForm team={{ name: team.name, phase: team.phase, practiceWeekdays: team.practiceWeekdays, matchWeekdays: team.matchWeekdays }} />
    </div>
  );
}
