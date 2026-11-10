import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { LogOut, Users } from "lucide-react";
import { homePath, requireUser } from "@/lib/auth/guards";
import { logout } from "@/actions/auth";
import { InviteCodeForm } from "@/components/forms/AuthForms";

/** Athlete account that isn't in a team yet (FUELX is for club athletes only). */
export default async function NoTeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  if (user.role === "COACH" || user.teamId) redirect(homePath(user));
  const [t, ts] = await Promise.all([getTranslations("auth"), getTranslations("settings")]);
  return (
    <div className="space-y-6 pt-6">
      <div className="card space-y-4 text-center">
        <Users className="mx-auto size-10 text-accent" aria-hidden />
        <h1 className="title">{t("noTeamTitle")}</h1>
        <p className="footnote">{t("noTeamBody")}</p>
      </div>
      <div className="card"><InviteCodeForm /></div>
      <form action={logout.bind(null, locale)} className="list-group">
        <button type="submit" className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-start font-medium text-accent hover:bg-surface-2">
          <LogOut className="size-5" aria-hidden />{ts("logout")}
        </button>
      </form>
    </div>
  );
}
