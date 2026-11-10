import crypto from "node:crypto";

const BASE = () => process.env.PAYMOB_BASE_URL || "https://accept.paymob.com";

export const paymobEnabled = () => Boolean(process.env.PAYMOB_SECRET_KEY && process.env.PAYMOB_PUBLIC_KEY && process.env.PAYMOB_INTEGRATION_ID);
export const priceCents = () => Math.round(Number(process.env.SUBSCRIPTION_PRICE_EGP || 499) * 100);
const appUrl = () => process.env.APP_URL || "http://localhost:3000";

type Billing = { name: string; email: string; phone: string };

function billingData(b: Billing) {
  const [first, ...rest] = b.name.trim().split(/\s+/);
  return {
    first_name: first || "Athlete", last_name: rest.join(" ") || "NA", email: b.email, phone_number: b.phone,
    apartment: "NA", floor: "NA", street: "NA", building: "NA", city: "NA", state: "NA", country: "EG", postal_code: "NA",
  };
}

async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${BASE()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Paymob ${path} failed: ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

/** Intention API -> Unified Checkout URL. `paymentId` comes back as the order's merchant reference. */
export async function createIntention(opts: { paymentId: string; amountCents: number; billing: Billing }) {
  const data = await post<{ client_secret: string; intention_order_id?: number | string }>(
    "/v1/intention/",
    {
      amount: opts.amountCents,
      currency: "EGP",
      payment_methods: [Number(process.env.PAYMOB_INTEGRATION_ID)],
      items: [{ name: "Monthly subscription", amount: opts.amountCents, description: "Athlete nutrition & training plan", quantity: 1 }],
      billing_data: billingData(opts.billing),
      special_reference: opts.paymentId,
      notification_url: `${appUrl()}/api/paymob/webhook`,
      redirection_url: `${appUrl()}/api/paymob/return`,
      extras: { paymentId: opts.paymentId },
    },
    { Authorization: `Token ${process.env.PAYMOB_SECRET_KEY}` },
  );
  return {
    orderId: data.intention_order_id != null ? String(data.intention_order_id) : null,
    checkoutUrl: `${BASE()}/unifiedcheckout/?publicKey=${encodeURIComponent(process.env.PAYMOB_PUBLIC_KEY!)}&clientSecret=${encodeURIComponent(data.client_secret)}`,
  };
}

/** Renewal: charge a saved card token through the MOTO integration (legacy Accept API). */
export async function chargeSavedCard(opts: { cardToken: string; amountCents: number; paymentId: string; billing: Billing }) {
  const { token: authToken } = await post<{ token: string }>("/api/auth/tokens", { api_key: process.env.PAYMOB_API_KEY });
  const order = await post<{ id: number }>("/api/ecommerce/orders", {
    auth_token: authToken, delivery_needed: false, amount_cents: opts.amountCents, currency: "EGP",
    merchant_order_id: opts.paymentId, items: [],
  });
  const { token: paymentToken } = await post<{ token: string }>("/api/acceptance/payment_keys", {
    auth_token: authToken, amount_cents: opts.amountCents, expiration: 3600, order_id: order.id,
    billing_data: billingData(opts.billing), currency: "EGP", integration_id: Number(process.env.PAYMOB_MOTO_INTEGRATION_ID),
  });
  const txn = await post<Record<string, unknown>>("/api/acceptance/payments/pay", {
    source: { identifier: opts.cardToken, subtype: "TOKEN" },
    payment_token: paymentToken,
  });
  return { orderId: String(order.id), transaction: txn };
}

/* ---------------- HMAC ---------------- */

const TXN_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id", "integration_id",
  "is_3d_secure", "is_auth", "is_capture", "is_refunded", "is_standalone_payment", "is_voided", "order.id", "owner",
  "pending", "source_data.pan", "source_data.sub_type", "source_data.type", "success",
];
const TOKEN_FIELDS = ["card_subtype", "created_at", "email", "id", "masked_pan", "merchant_id", "order_id", "token"];

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

export function computeHmac(obj: unknown, type: "TRANSACTION" | "TOKEN", secret = process.env.PAYMOB_HMAC_SECRET || "") {
  const fields = type === "TOKEN" ? TOKEN_FIELDS : TXN_FIELDS;
  const concat = fields.map((f) => {
    const v = get(obj, f);
    return v === undefined || v === null ? "" : String(v);
  }).join("");
  return crypto.createHmac("sha512", secret).update(concat).digest("hex");
}

export function verifyHmac(obj: unknown, type: "TRANSACTION" | "TOKEN", hmac: string | null) {
  if (!hmac || !process.env.PAYMOB_HMAC_SECRET) return false;
  const expected = Buffer.from(computeHmac(obj, type), "hex");
  const given = Buffer.from(hmac, "hex");
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
