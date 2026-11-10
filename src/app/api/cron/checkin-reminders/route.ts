import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { addDays, today } from "@/lib/dates";
import { cronUnauthorized } from "@/lib/cron";
import { sendEmail } from "@/lib/email";
import { nextCheckInDay } from "@/lib/plan/service";
import { hasAccess } from "@/lib/subscription";

/** Daily: remind on the check-in day, and again 48h later if still missing. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;

  const day = today();
  const plans = await db.nutritionPlan.findMany({
    where: { status: "ACTIVE" },
    include: { checkIns: { select: { weekNumber: true } }, user: { include: { subscription: true } } },
  });

  let sent = 0;
  for (const plan of plans) {
    if (!hasAccess(plan.user.subscription)) continue;
    const next = nextCheckInDay(plan.startDay, plan.checkIns.map((c) => c.weekNumber));
    if (!next) continue;
    const followUp = day === addDays(next.day, 2);
    if (day !== next.day && !followUp) continue;

    const locale = plan.user.locale;
    const t = await getTranslations({ locale, namespace: "email" });
    const link = `${process.env.APP_URL}/${locale}/checkin`;
    await sendEmail(
      plan.user.email,
      followUp ? t("reminderLateSubject") : t("reminderSubject", { week: next.week }),
      t("reminderBody", { name: plan.user.name, week: next.week, link }),
    );
    sent++;
  }
  return NextResponse.json({ ok: true, sent });
}
