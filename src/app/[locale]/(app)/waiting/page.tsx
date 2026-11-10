import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Hourglass, LogOut } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { teamHasAccess } from "@/lib/subscription";
import { needsConsent } from "@/lib/team";
import { logout } from "@/actions/auth";
import { Link } from "@/i18n/navigation";

/** Athlete is blocked on their coach: team subscription inactive, or guardian consent (16-17) not confirmed. */
export default async function WaitingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  if (user.role === "COACH") redirect(`/${locale}/coach`);
  if (!user.teamId) redirect(`/${locale}/no-team`);
  const [team, profile, access] = await Promise.all([
    db.team.findUnique({ where: { id: user.teamId } }),
    db.athleteProfile.findUnique({ where: { userId: user.id } }),
    teamHasAccess(user.teamId),
  ]);
  if (!profile) redirect(`/${locale}/onboarding`);
  const consentMissing = needsConsent(profile.birthDate) && !profile.consentConfirmedAt;
  if (access && !consentMissing) redirect(`/${locale}/today`);
  const [t, ts] = await Promise.all([getTranslations("waiting"), getTranslations("settings")]);
  const reason = !access ? "subscription" : "consent";

  return (
    <div className="space-y-6 pt-6">
      <div className="card space-y-4 text-center">
        <Hourglass className="mx-auto size-10 text-accent" aria-hidden />
        <h1 className="title">{t(`${reason}.title`)}</h1>
        <p className="footnote">{t(`${reason}.body`, { team: team?.name ?? "" })}</p>
        <Link href="/onboarding" className="btn-secondary w-full">{t("editProfile")}</Link>
      </div>
      <form action={logout.bind(null, locale)} className="list-group">
        <button type="submit" className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-start font-medium text-accent hover:bg-surface-2">
          <LogOut className="size-5" aria-hidden />{ts("logout")}
        </button>
      </form>
    </div>
  );
}
