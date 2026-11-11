import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CalendarClock, MapPin, Pencil, StickyNote, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireCoach } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { canTakeAttendance, endTime } from "@/lib/schedule";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { AttendanceForm } from "@/components/schedule/AttendanceForm";

/** One session: details and the attendance sheet. */
export default async function CoachSessionPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { team } = await requireCoach(locale);
  const session = await db.teamSession.findFirst({
    where: { id, teamId: team.id },
    include: { athlete: { select: { id: true, name: true } }, createdBy: { select: { name: true, role: true } }, attendance: true },
  });
  if (!session) notFound();
  const [t, format] = await Promise.all([getTranslations("schedule"), getFormatter()]);
  const expected = session.athlete
    ? [session.athlete]
    : await db.user.findMany({ where: { teamId: team.id, role: "ATHLETE" }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const status = new Map(session.attendance.map((a) => [a.athleteId, a.status]));
  const date = format.dateTime(new Date(`${session.day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" });
  const open = canTakeAttendance(session, today());

  const facts = [
    { Icon: CalendarClock, text: <>{date} · <span dir="ltr" className="tnum">{session.startTime}–{endTime(session.startTime, session.durationMin)}</span></> },
    { Icon: Users, text: session.athlete ? `${session.athlete.name}${session.createdBy.role === "ATHLETE" ? ` · ${t("addedByAthlete")}` : ""}` : t("wholeTeam") },
    session.location ? { Icon: MapPin, text: session.location } : null,
    session.notes ? { Icon: StickyNote, text: <span dir="auto" className="whitespace-pre-line">{session.notes}</span> } : null,
  ].filter((f) => f !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: session.day < today() ? "/coach/schedule?view=past" : "/coach/schedule", label: t("title") }}
        title={session.title || t(`kinds.${session.kind}`)}
        subtitle={session.title ? t(`kinds.${session.kind}`) : undefined}
        action={<Link href={`/coach/schedule/${session.id}/edit`} className="icon-btn bg-surface" aria-label={t("edit")}><Pencil className="size-5" aria-hidden /></Link>}
      />
      <ul className="list-group divide-y divide-line">
        {facts.map(({ Icon, text }, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3 text-[0.9375rem]">
            <Icon className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden /><span className="min-w-0">{text}</span>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="section-label">{t("attendance")}</h2>
        {!open ? (
          <p className="footnote rounded-2xl bg-surface px-4 py-3">{t("attendanceOpens", { date })}</p>
        ) : expected.length === 0 ? (
          <p className="footnote rounded-2xl bg-surface px-4 py-3">{t("noAthletes")}</p>
        ) : (
          <AttendanceForm sessionId={session.id} athletes={expected.map((a) => ({ ...a, status: status.get(a.id) ?? null }))} />
        )}
      </section>
    </div>
  );
}
