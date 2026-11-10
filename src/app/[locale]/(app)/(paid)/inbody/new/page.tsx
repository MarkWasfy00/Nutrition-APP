import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePaidUser } from "@/lib/auth/guards";
import { geminiEnabled } from "@/lib/ai/gemini";
import { InBodyForm } from "@/components/forms/InBodyForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function NewInBodyPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ purpose?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePaidUser(locale);
  const t = await getTranslations("inbody");
  const purpose = (await searchParams).purpose === "checkin" ? "checkin" : "plan";
  return (
    <div>
      <PageHeader title={t("title")} subtitle={purpose === "plan" ? t("subtitlePlan") : t("subtitleCheckin")} />
      <InBodyForm purpose={purpose} aiEnabled={geminiEnabled()} />
    </div>
  );
}
