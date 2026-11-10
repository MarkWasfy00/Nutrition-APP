import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { cronUnauthorized } from "@/lib/cron";
import { sendEmail } from "@/lib/email";
import { chargeSavedCard, paymobEnabled, priceCents } from "@/lib/payments/paymob";
import { applyTransaction, GRACE_DAYS } from "@/lib/subscription";
import { subscriptionAmount } from "@/lib/team";

const DAY = 86_400_000;

/** Daily: expire lapsed team subscriptions and charge saved cards for those ending within a day. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req);
  if (denied) return denied;
  const now = new Date();

  const expired = await db.subscription.updateMany({
    where: {
      OR: [
        { status: "PAST_DUE", graceUntil: { lt: now } },
        { status: "CANCELED", currentPeriodEnd: { lt: now } },
      ],
    },
    data: { status: "EXPIRED" },
  });

  const due = await db.subscription.findMany({
    where: { status: "ACTIVE", currentPeriodEnd: { lte: new Date(now.getTime() + DAY) } },
    include: { team: { include: { members: { where: { role: "COACH" }, orderBy: { createdAt: "asc" } } } } },
  });

  const results: Record<string, string> = {};
  for (const sub of due) {
    const coaches = sub.team.members;
    const payer = coaches[0];
    const pastDue = async () => {
      await db.subscription.update({
        where: { id: sub.id },
        data: { status: "PAST_DUE", graceUntil: new Date((sub.currentPeriodEnd ?? now).getTime() + GRACE_DAYS * DAY) },
      });
      for (const coach of coaches) {
        const t = await getTranslations({ locale: coach.locale, namespace: "email" });
        await sendEmail(coach.email, t("paymentFailedSubject"), t("paymentFailedBody", { name: coach.name, team: sub.team.name, link: `${process.env.APP_URL}/${coach.locale}/billing` }));
      }
    };

    if (!payer || !sub.cardToken || !paymobEnabled() || !process.env.PAYMOB_MOTO_INTEGRATION_ID) {
      if (sub.currentPeriodEnd && sub.currentPeriodEnd < now) { await pastDue(); results[sub.id] = "past_due_no_card"; }
      continue;
    }
    // Never charge twice: skip if a renewal attempt already exists in the last 20h.
    const recent = await db.payment.findFirst({
      where: { teamId: sub.teamId, isRenewal: true, createdAt: { gt: new Date(now.getTime() - 20 * 3600_000) } },
    });
    if (recent) { results[sub.id] = "already_attempted"; continue; }

    const seats = sub.team.nextSeats ?? sub.team.seats;
    const payment = await db.payment.create({
      data: { userId: payer.id, teamId: sub.teamId, seats, amountCents: subscriptionAmount(seats, priceCents()), isRenewal: true },
    });
    try {
      const { orderId, transaction } = await chargeSavedCard({
        cardToken: sub.cardToken, amountCents: payment.amountCents, paymentId: payment.id,
        billing: { name: payer.name, email: payer.email, phone: payer.phone || "NA" },
      });
      await db.payment.update({ where: { id: payment.id }, data: { paymobOrderId: orderId } });
      if (transaction.id != null && transaction.pending !== true) {
        results[sub.id] = await applyTransaction(payment.id, {
          transactionId: String(transaction.id), success: transaction.success === true, orderId, raw: transaction,
        });
        if (transaction.success !== true) await pastDue();
      } else {
        results[sub.id] = "pending";
      }
    } catch (e) {
      console.error("[renew] charge failed", sub.id, e);
      await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      await pastDue();
      results[sub.id] = "error";
    }
  }
  return NextResponse.json({ ok: true, expired: expired.count, results });
}
