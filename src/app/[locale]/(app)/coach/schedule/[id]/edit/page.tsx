import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireCoach } from "@/lib/auth/guards";
import { addDays, today } from "@/lib/dates";
import { SCHEDULE_WINDOW } from "@/lib/schedule";
import { deleteSession } from "@/actions/schedule";
import { PageHeader } from "@/components/ui/PageHeader";
import { SessionForm } from "@/components/schedule/SessionForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function EditCoachSessionPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { team } = await requireCoach(locale);
  const [session, athletes, t] = await Promise.all([
    db.teamSession.findFirst({ where: { id, teamId: team.id } }),
    db.user.findMany({ where: { teamId: team.id, role: "ATHLETE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getTranslations("schedule"),
  ]);
  if (!session) notFound();
  const day = today();
  // Keep an older session editable even when it falls outside the usual window.
  const minDay = [addDays(day, -SCHEDULE_WINDOW.pastDays), session.day].sort()[0];
  return (
    <div className="space-y-6">
      <PageHeader back={{ href: `/coach/schedule/${session.id}`, label: session.title || t(`kinds.${session.kind}`) }} title={t("editTitle")} />
      <SessionForm sessionId={session.id} athletes={athletes} values={session} minDay={minDay} maxDay={addDays(day, SCHEDULE_WINDOW.futureDays)} />
      <form action={deleteSession.bind(null, session.id)} className="list-group">
        <SubmitButton className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-start font-medium text-accent hover:bg-surface-2">
          <Trash2 className="size-5" aria-hidden />{t("delete")}
        </SubmitButton>
      </form>
      <p className="footnote -mt-4 px-4">{t("deleteHint")}</p>
    </div>
  );
}
