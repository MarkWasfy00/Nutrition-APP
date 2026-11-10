import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, CreditCard, LogOut, SlidersHorizontal, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { logout } from "@/actions/auth";
import { SettingsForm } from "@/components/forms/BillingForms";
import { SupplementsForm } from "@/components/forms/SupplementsForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListGroup, ListRow } from "@/components/ui/List";

export default async function SettingsPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ saved?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const isCoach = user.role === "COACH";
  const [t, ts, profile, team] = await Promise.all([
    getTranslations("settings"),
    getTranslations("supplements"),
    db.athleteProfile.findUnique({ where: { userId: user.id } }),
    user.teamId ? db.team.findUnique({ where: { id: user.teamId }, select: { name: true } }) : null,
  ]);
  const { saved } = await searchParams;
  const initials = user.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-7">
      <PageHeader title={t("title")} />
      {saved && <p role="status" className="rounded-2xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">{t("profileSaved")}</p>}

      <div className="flex items-center gap-4 px-1">
        <span className="grid size-14 place-items-center rounded-full bg-tonal text-lg font-semibold text-accent" aria-hidden>{initials}</span>
        <div className="min-w-0">
          <p className="headline text-lg">{user.name}</p>
          <p className="footnote truncate" dir="ltr">{user.email}</p>
        </div>
      </div>

      <section>
        <h2 className="section-label">{t("account")}</h2>
        <SettingsForm name={user.name} phone={user.phone} addBack={isCoach ? undefined : user.addBackExerciseKcal} />
      </section>

      {isCoach ? (
        <ListGroup title={t("teamSection")}>
          <ListRow href="/coach/team" icon={<CalendarDays className="size-[1.125rem]" />} title={t("teamSchedule")} subtitle={team?.name} />
          <ListRow href="/billing" icon={<CreditCard className="size-[1.125rem]" />} title={t("subscription")} subtitle={t("subscriptionHint")} />
        </ListGroup>
      ) : (
        <ListGroup title={t("planSection")}>
          <ListRow href="/onboarding" icon={<SlidersHorizontal className="size-[1.125rem]" />} title={t("editProfile")} subtitle={t("editProfileHint")} />
          {team && <ListRow icon={<Users className="size-[1.125rem]" />} title={t("yourTeam")} subtitle={team.name} />}
        </ListGroup>
      )}

      {profile && (
        <section id="supplements" className="scroll-mt-20">
          <h2 className="section-label">{ts("title")}</h2>
          <div className="card">
            <SupplementsForm use={profile.useSupplements} selected={profile.supplements} />
          </div>
        </section>
      )}

      <form action={logout.bind(null, locale)} className="list-group">
        <button type="submit" className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-start font-medium text-accent hover:bg-surface-2">
          <LogOut className="size-5" aria-hidden />{t("logout")}
        </button>
      </form>
      <p className="footnote px-4">{t("disclaimer")}</p>
    </div>
  );
}
