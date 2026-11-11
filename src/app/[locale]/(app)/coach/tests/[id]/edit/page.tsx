import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireCoach } from "@/lib/auth/guards";
import { addDays, today } from "@/lib/dates";
import { SCHEDULE_WINDOW } from "@/lib/schedule";
import { deleteAssignment } from "@/actions/biomotor";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssignmentForm } from "@/components/biomotor/AssignmentForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function EditTestAssignmentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { team } = await requireCoach(locale);
  const [assignment, athletes, t] = await Promise.all([
    db.biomotorAssignment.findFirst({ where: { id, teamId: team.id } }),
    db.user.findMany({ where: { teamId: team.id, role: "ATHLETE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getTranslations("biomotor"),
  ]);
  if (!assignment) notFound();
  const day = today();
  // Keep an older assignment editable even when it falls outside the usual window.
  const minDay = [addDays(day, -SCHEDULE_WINDOW.pastDays), assignment.day].sort()[0];
  return (
    <div className="space-y-6">
      <PageHeader back={{ href: `/coach/tests/${assignment.id}`, label: assignment.title || t("title") }} title={t("editTitle")} />
      <AssignmentForm assignmentId={assignment.id} athletes={athletes} values={assignment} minDay={minDay} maxDay={addDays(day, SCHEDULE_WINDOW.futureDays)} />
      <form action={deleteAssignment.bind(null, assignment.id)} className="list-group">
        <SubmitButton className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-start font-medium text-accent hover:bg-surface-2">
          <Trash2 className="size-5" aria-hidden />{t("delete")}
        </SubmitButton>
      </form>
      <p className="footnote -mt-4 px-4">{t("deleteHint")}</p>
    </div>
  );
}
