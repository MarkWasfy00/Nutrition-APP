import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePaidUser } from "@/lib/auth/guards";
import { addDays, today } from "@/lib/dates";
import { SCHEDULE_WINDOW } from "@/lib/schedule";
import { PageHeader } from "@/components/ui/PageHeader";
import { SessionForm } from "@/components/schedule/SessionForm";

/** Athlete adds their own session (extra training, physio, ...). Their coach sees it and can take attendance. */
export default async function NewSessionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePaidUser(locale);
  const t = await getTranslations("schedule");
  const day = today();
  return (
    <div>
      <PageHeader back={{ href: "/schedule", label: t("title") }} title={t("newTitle")} subtitle={t("ownHint")} />
      <SessionForm
        sessionId={null}
        minDay={addDays(day, -SCHEDULE_WINDOW.pastDays)}
        maxDay={addDays(day, SCHEDULE_WINDOW.futureDays)}
        values={{ kind: "SC", title: null, day, startTime: "18:00", durationMin: 60, location: null, notes: null, athleteId: null }}
      />
    </div>
  );
}
