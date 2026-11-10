import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { RegisterForm } from "@/components/forms/AuthForms";
import { AuthShell } from "@/components/AuthShell";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if ((await auth())?.user) redirect(`/${locale}/today`);
  const t = await getTranslations("auth");
  return (
    <AuthShell subtitle={t("joinSubtitle")} title={t("joinTitle")} footer={<>{t("haveAccount")} <Link href="/login" className="font-semibold text-accent">{t("login")}</Link></>}>
      <RegisterForm />
    </AuthShell>
  );
}
