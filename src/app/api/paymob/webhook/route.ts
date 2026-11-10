import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyHmac } from "@/lib/payments/paymob";
import { applyTransaction } from "@/lib/subscription";

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Paymob processed callback (TRANSACTION) and card token callback (TOKEN). */
export async function POST(req: Request) {
  const hmac = new URL(req.url).searchParams.get("hmac");
  const body = (await req.json().catch(() => null)) as { type?: string; obj?: Obj } | null;
  if (!body?.obj || !body.type) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const type = body.type === "TOKEN" ? "TOKEN" : "TRANSACTION";
  if (!verifyHmac(body.obj, type, hmac)) return NextResponse.json({ error: "INVALID_HMAC" }, { status: 401 });

  const obj = body.obj;
  if (type === "TOKEN") {
    const payment = await db.payment.findFirst({ where: { paymobOrderId: String(obj.order_id) } });
    if (payment) {
      await db.subscription.updateMany({
        where: { userId: payment.userId },
        data: { cardToken: String(obj.token), cardMaskedPan: obj.masked_pan ? String(obj.masked_pan) : null },
      });
    }
    return NextResponse.json({ ok: true });
  }

  const orderId = obj.order?.id != null ? String(obj.order.id) : null;
  const paymentId: string | undefined =
    obj.order?.merchant_order_id || obj.payment_key_claims?.extra?.paymentId ||
    (orderId ? (await db.payment.findFirst({ where: { paymobOrderId: orderId } }))?.id : undefined);
  if (!paymentId) return NextResponse.json({ ok: true, result: "unknown" });
  if (obj.pending === true) return NextResponse.json({ ok: true, result: "pending" });

  const result = await applyTransaction(String(paymentId), {
    transactionId: String(obj.id),
    success: obj.success === true,
    orderId,
    raw: obj,
  });
  return NextResponse.json({ ok: true, result });
}
