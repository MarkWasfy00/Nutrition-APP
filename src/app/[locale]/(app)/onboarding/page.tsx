import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { homePath, requireUser } from "@/lib/auth/guards";
import { OnboardingForm } from "@/components/forms/OnboardingForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  if (user.role === "COACH" || !user.teamId) redirect(homePath(user));
  const [profile, pref, team] = await Promise.all([
    db.athleteProfile.findUnique({ where: { userId: user.id } }),
    db.trainingPreference.findUnique({ where: { userId: user.id } }),
    db.team.findUnique({ where: { id: user.teamId } }),
  ]);
  const [t, ts] = await Promise.all([getTranslations("onboarding"), getTranslations("settings")]);
  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <form action={logout.bind(null, locale)}>
            <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[0.9375rem] font-medium text-accent hover:bg-surface-2">
              <LogOut className="size-5 rtl:rotate-180" aria-hidden />{ts("logout")}
            </button>
          </form>
        }
      />
      <OnboardingForm
        team={{ practiceWeekdays: team?.practiceWeekdays ?? [], matchWeekdays: team?.matchWeekdays ?? [] }}
        d={{
          sport: profile?.sport ?? team?.sport, sex: profile?.sex, birthDate: profile?.birthDate.toISOString().slice(0, 10),
          heightCm: profile?.heightCm, goal: profile?.goal, targetWeightKg: profile?.targetWeightKg,
          intensity: profile?.intensity, mealsPerDay: profile?.mealsPerDay, allergies: profile?.allergies,
          dietaryPrefs: profile?.dietaryPrefs, useSupplements: profile?.useSupplements, supplements: profile?.supplements,
          experience: pref?.experience, sessionMinutes: pref?.sessionMinutes, weekdays: pref?.weekdays, injuries: pref?.injuries,
        }}
      />
    </div>
  );
}
