import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ClipboardPlus, Printer } from "lucide-react";
import { managedAthlete, requireCoach } from "@/lib/auth/guards";
import { PrintButton } from "@/components/PrintButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListGroup, ListRow } from "@/components/ui/List";
import { AthleteReport } from "@/components/biomotor/AthleteReport";

/** One athlete's biomotor report, seen by their coach. */
export default async function CoachAthleteTestsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user: coach, team } = await requireCoach(locale);
  const athlete = await managedAthlete(coach, id);
  if (!athlete) notFound();
  const t = await getTranslations("biomotor");
  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `/coach/athletes/${athlete.id}`, label: athlete.name }}
        title={t("title")}
        subtitle={t("reportFor", { name: athlete.name })}
        action={<PrintButton label={t("print")} icon={<Printer className="size-5" aria-hidden />} />}
      />
      <ListGroup className="no-print">
        <ListRow href={`/coach/tests/new?athlete=${athlete.id}`} icon={<ClipboardPlus className="size-[1.125rem]" />} title={t("addFor", { name: athlete.name })} />
      </ListGroup>
      <AthleteReport athleteId={athlete.id} teamId={team.id} empty={t("noReportCoach", { name: athlete.name })} />
    </div>
  );
}
