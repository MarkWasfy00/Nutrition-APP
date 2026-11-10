import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { RegisterClubForm } from "@/components/forms/AuthForms";
import { AuthShell } from "@/components/AuthShell";

/** Club / coach sign-up. Athletes join through their coach's invite link instead. */
export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if ((await auth())?.user) redirect(`/${locale}/today`);
  const t = await getTranslations("auth");
  return (
    <AuthShell
      title={t("clubTitle")}
      subtitle={t("clubSubtitle")}
      footer={<>{t("haveAccount")} <Link href="/login" className="font-semibold text-accent">{t("login")}</Link><br /><span className="footnote">{t("athleteHint")}</span></>}
    >
      <RegisterClubForm />
    </AuthShell>
  );
}
