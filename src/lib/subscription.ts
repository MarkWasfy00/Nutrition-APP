import type { Prisma, Subscription } from "@prisma/client";
import { db } from "./db";

export const PERIOD_DAYS = 30;
export const GRACE_DAYS = 3;
const DAY = 86_400_000;

export function hasAccess(sub: Pick<Subscription, "status" | "currentPeriodEnd" | "graceUntil"> | null, now = new Date()) {
  if (!sub) return false;
  if ((sub.status === "ACTIVE" || sub.status === "CANCELED") && sub.currentPeriodEnd && sub.currentPeriodEnd > now) return true;
  if (sub.status === "PAST_DUE" && sub.graceUntil && sub.graceUntil > now) return true;
  return false;
}

/** Demo mode: PAYMENTS_DISABLED="true" gives every user full access and hides checkout. */
export const paymentsDisabled = () => process.env.PAYMENTS_DISABLED === "true";

export async function userHasAccess(userId: string) {
  if (paymentsDisabled()) return true;
  return hasAccess(await db.subscription.findUnique({ where: { userId } }));
}

export type TxnResult = { transactionId: string; success: boolean; orderId?: string | null; raw: unknown };

/**
 * Idempotent: a payment/transaction is applied once. Success extends the period by 30 days
 * from the later of now / current period end.
 */
export async function applyTransaction(paymentId: string, txn: TxnResult): Promise<"applied" | "failed" | "duplicate" | "unknown"> {
  try {
    return await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) return "unknown";
      if (payment.status !== "PENDING") return "duplicate";
      const now = new Date();

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: txn.success ? "SUCCESS" : "FAILED",
          paymobTransactionId: txn.transactionId,
          paymobOrderId: txn.orderId ?? payment.paymobOrderId,
          raw: txn.raw as Prisma.InputJsonValue,
        },
      });

      const sub = await tx.subscription.findUnique({ where: { userId: payment.userId } });
      if (!txn.success) {
        if (payment.isRenewal && sub) {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { status: "PAST_DUE", graceUntil: new Date((sub.currentPeriodEnd ?? now).getTime() + GRACE_DAYS * DAY) },
          });
        }
        return "failed";
      }

      const start = sub?.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
      const end = new Date(start.getTime() + PERIOD_DAYS * DAY);
      await tx.subscription.upsert({
        where: { userId: payment.userId },
        create: {
          userId: payment.userId, status: "ACTIVE", amountCents: payment.amountCents,
          currentPeriodStart: start, currentPeriodEnd: end, lastTransactionId: txn.transactionId, paymobOrderId: txn.orderId ?? null,
        },
        update: {
          status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end, graceUntil: null, cancelAtPeriodEnd: false,
          lastTransactionId: txn.transactionId, paymobOrderId: txn.orderId ?? undefined,
        },
      });
      return "applied";
    });
  } catch (e) {
    // Unique violation on paymobTransactionId => this transaction was already processed.
    if ((e as { code?: string }).code === "P2002") return "duplicate";
    throw e;
  }
}
