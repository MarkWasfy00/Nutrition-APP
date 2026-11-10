"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Payment, User } from "@prisma/client";
import { db } from "@/lib/db";
import { actionCoach } from "@/lib/auth/guards";
import { createIntention, paymobEnabled, priceCents } from "@/lib/payments/paymob";
import { applyTransaction, hasAccess, paymentsDisabled } from "@/lib/subscription";
import { MAX_SEATS, subscriptionAmount, topUpAmount } from "@/lib/team";
import type { FormState } from "./auth";

const athleteCount = (teamId: string) => db.user.count({ where: { teamId, role: "ATHLETE" } });

function readPhone(form: FormData) {
  const phone = String(form.get("phone") || "").replace(/[^\d+]/g, "");
  return /^(\+?20)?0?1[0125]\d{8}$/.test(phone) ? phone : null;
}

function readSeats(form: FormData) {
  const n = Number(form.get("seats"));
  return Number.isInteger(n) && n >= 1 && n <= MAX_SEATS ? n : null;
}

/** Sends the coach to Paymob (or simulates the payment in local development). */
async function pay(coach: User, payment: Payment, phone: string, description: string): Promise<FormState> {
  // Local development without Paymob keys: payments are simulated (never in production).
  if (!paymobEnabled() && process.env.NODE_ENV === "production") return { error: "paymentsUnavailable" };
  if (!paymobEnabled()) {
    await applyTransaction(payment.id, { transactionId: `dev_${payment.id}`, success: true, raw: { simulated: true } });
    redirect(`/${coach.locale}/billing?status=success`);
  }
  let checkoutUrl: string;
  try {
    const intention = await createIntention({
      paymentId: payment.id,
      amountCents: payment.amountCents,
      description,
      billing: { name: coach.name, email: coach.email, phone },
    });
    await db.payment.update({ where: { id: payment.id }, data: { paymobOrderId: intention.orderId } });
    checkoutUrl = intention.checkoutUrl;
  } catch (e) {
    console.error("[billing] intention failed", e);
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { error: "paymentsUnavailable" };
  }
  redirect(checkoutUrl);
}

/** First subscription (or paying again after it lapsed): seats x price per athlete per month. */
export async function startCheckout(_: FormState, form: FormData): Promise<FormState> {
  const coach = await actionCoach();
  if (paymentsDisabled()) return { error: "paymentsUnavailable" };
  const phone = readPhone(form);
  if (!phone) return { error: "phone" };
  const seats = readSeats(form);
  if (!seats) return { error: "seats" };
  if (seats < (await athleteCount(coach.teamId))) return { error: "seatsBelowAthletes" };
  await db.user.update({ where: { id: coach.id }, data: { phone } });

  const sub = await db.subscription.findUnique({ where: { teamId: coach.teamId } });
  if (hasAccess(sub) && sub?.status === "ACTIVE") return { error: "alreadyActive" };

  const payment = await db.payment.create({
    data: { userId: coach.id, teamId: coach.teamId, seats, amountCents: subscriptionAmount(seats, priceCents()) },
  });
  return pay(coach, payment, phone, `${seats} athlete seats, 1 month`);
}

/** Adds seats now; charged pro rata for the rest of the current period. */
export async function buySeats(_: FormState, form: FormData): Promise<FormState> {
  const coach = await actionCoach();
  if (paymentsDisabled()) return { error: "paymentsUnavailable" };
  const added = readSeats(form);
  if (!added) return { error: "seats" };
  const phone = readPhone(form) ?? coach.phone;
  if (!phone) return { error: "phone" };
  const [team, sub] = await Promise.all([
    db.team.findUniqueOrThrow({ where: { id: coach.teamId } }),
    db.subscription.findUnique({ where: { teamId: coach.teamId } }),
  ]);
  if (!hasAccess(sub) || sub?.status === "PAST_DUE") return { error: "notActive" };
  if (team.seats + added > MAX_SEATS) return { error: "seats" };

  const payment = await db.payment.create({
    data: {
      userId: coach.id, teamId: coach.teamId, seats: added, isTopUp: true,
      amountCents: topUpAmount(added, priceCents(), sub!.currentPeriodEnd),
    },
  });
  return pay(coach, payment, phone, `${added} extra athlete seats, rest of this month`);
}

/** Fewer seats from the next renewal. Can't go below the athletes already in the team. */
export async function setRenewalSeats(_: FormState, form: FormData): Promise<FormState> {
  const coach = await actionCoach();
  const seats = readSeats(form);
  if (!seats) return { error: "seats" };
  const team = await db.team.findUniqueOrThrow({ where: { id: coach.teamId } });
  if (seats > team.seats) return { error: "useBuySeats" };
  if (seats < (await athleteCount(coach.teamId))) return { error: "seatsBelowAthletes" };
  await db.team.update({ where: { id: team.id }, data: { nextSeats: seats === team.seats ? null : seats } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cancelSubscription() {
  const coach = await actionCoach();
  await db.subscription.updateMany({
    where: { teamId: coach.teamId, status: "ACTIVE" },
    data: { status: "CANCELED", cancelAtPeriodEnd: true },
  });
  revalidatePath("/", "layout");
}

export async function resumeSubscription() {
  const coach = await actionCoach();
  const sub = await db.subscription.findUnique({ where: { teamId: coach.teamId } });
  if (sub?.status === "CANCELED" && hasAccess(sub)) {
    await db.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", cancelAtPeriodEnd: false } });
  }
  revalidatePath("/", "layout");
}
