import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requirePaidUser } from "@/lib/auth/guards";
import { addDays, today } from "@/lib/dates";
import { SCHEDULE_WINDOW } from "@/lib/schedule";
import { deleteSession } from "@/actions/schedule";
import { PageHeader } from "@/components/ui/PageHeader";
import { SessionForm } from "@/components/schedule/SessionForm";
import { SubmitButton } from "@/components/SubmitButton";

/** Athletes edit sessions they added themselves, until their coach records attendance. */
export default async function EditSessionPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { user } = await requirePaidUser(locale);
  const session = await db.teamSession.findFirst({
    where: { id, teamId: user.teamId!, createdById: user.id, athleteId: user.id, attendance: { none: {} } },
  });
  if (!session) notFound();
  const t = await getTranslations("schedule");
  const day = today();
  const minDay = [addDays(day, -SCHEDULE_WINDOW.pastDays), session.day].sort()[0];
  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/schedule", label: t("title") }} title={t("editTitle")} />
      <SessionForm sessionId={session.id} values={session} minDay={minDay} maxDay={addDays(day, SCHEDULE_WINDOW.futureDays)} />
      <form action={deleteSession.bind(null, session.id)} className="list-group">
        <SubmitButton className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-start font-medium text-accent hover:bg-surface-2">
          <Trash2 className="size-5" aria-hidden />{t("delete")}
        </SubmitButton>
      </form>
    </div>
  );
}
