"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actionUser } from "@/lib/auth/guards";
import { createIntention, paymobEnabled, priceCents } from "@/lib/payments/paymob";
import { applyTransaction, hasAccess, paymentsDisabled } from "@/lib/subscription";
import type { FormState } from "./auth";

export async function startCheckout(_: FormState, form: FormData): Promise<FormState> {
  const user = await actionUser();
  if (paymentsDisabled()) return { error: "paymentsUnavailable" };
  const phone = String(form.get("phone") || "").replace(/[^\d+]/g, "");
  if (!/^(\+?20)?0?1[0125]\d{8}$/.test(phone)) return { error: "phone" };
  await db.user.update({ where: { id: user.id }, data: { phone } });

  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (hasAccess(sub) && sub?.status === "ACTIVE") return { error: "alreadyActive" };

  // Local development without Paymob keys: payments are simulated (never in production).
  if (!paymobEnabled() && process.env.NODE_ENV === "production") return { error: "paymentsUnavailable" };

  const payment = await db.payment.create({ data: { userId: user.id, amountCents: priceCents() } });

  if (!paymobEnabled()) {
    await applyTransaction(payment.id, { transactionId: `dev_${payment.id}`, success: true, raw: { simulated: true } });
    redirect(`/${user.locale}/billing?status=success`);
  }

  let checkoutUrl: string;
  try {
    const intention = await createIntention({
      paymentId: payment.id,
      amountCents: payment.amountCents,
      billing: { name: user.name, email: user.email, phone },
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

export async function cancelSubscription() {
  const user = await actionUser();
  await db.subscription.updateMany({
    where: { userId: user.id, status: "ACTIVE" },
    data: { status: "CANCELED", cancelAtPeriodEnd: true },
  });
  revalidatePath("/", "layout");
}

export async function resumeSubscription() {
  const user = await actionUser();
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  if (sub?.status === "CANCELED" && hasAccess(sub)) {
    await db.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", cancelAtPeriodEnd: false } });
  }
  revalidatePath("/", "layout");
}
