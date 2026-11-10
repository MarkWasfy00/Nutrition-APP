import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/forms/AuthForms";

export default async function LoginPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if ((await auth())?.user) redirect(`/${locale}/today`);
  const t = await getTranslations("auth");
  const { next } = await searchParams;
  return (
    <AuthShell subtitle={t("loginSubtitle")} title={t("welcomeBack")} footer={<>{t("noAccount")} <Link href="/register" className="font-semibold text-accent">{t("register")}</Link></>}>
      <LoginForm next={next} />
    </AuthShell>
  );
}
