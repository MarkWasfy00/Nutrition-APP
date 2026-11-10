import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { JoinForm } from "@/components/forms/AuthForms";
import { AuthShell } from "@/components/AuthShell";

/** Public invite link a coach shares with athletes: /join/<inviteCode>. */
export default async function JoinPage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  if ((await auth())?.user) redirect(`/${locale}/today`);
  const [t, ts] = await Promise.all([getTranslations("auth"), getTranslations("sports")]);
  const team = await db.team.findUnique({ where: { inviteCode: code.toUpperCase() }, select: { name: true, sport: true } });
  const footer = <>{t("haveAccount")} <Link href="/login" className="font-semibold text-accent">{t("login")}</Link></>;

  if (!team) {
    return (
      <AuthShell title={t("badCodeTitle")} subtitle={t("errors.badCode")} footer={footer}>
        <p className="footnote">{t("askCoach")}</p>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={t("joinTitle", { team: team.name })} subtitle={`${ts.has(team.sport) ? ts(team.sport) : team.sport} · ${t("joinSubtitle")}`} footer={footer}>
      <JoinForm code={code.toUpperCase()} />
    </AuthShell>
  );
}
