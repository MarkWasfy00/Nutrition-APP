import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { computeHmac, verifyHmac } from "./paymob";

const obj = {
  amount_cents: 49900, created_at: "2026-10-27T10:00:00.000000", currency: "EGP", error_occured: false,
  has_parent_transaction: false, id: 123456, integration_id: 4000, is_3d_secure: true, is_auth: false,
  is_capture: false, is_refunded: false, is_standalone_payment: true, is_voided: false, order: { id: 987 },
  owner: 55, pending: false, source_data: { pan: "2346", sub_type: "MasterCard", type: "card" }, success: true,
};

describe("paymob hmac", () => {
  it("concatenates the documented fields in order", () => {
    const concat = "4990020" + "26-10-27T10:00:00.000000EGPfalsefalse1234564000truefalsefalsefalsetruefalse98755false2346MasterCardcardtrue";
    const expected = crypto.createHmac("sha512", "s3cret").update(concat).digest("hex");
    expect(computeHmac(obj, "TRANSACTION", "s3cret")).toBe(expected);
  });

  it("verifies and rejects tampering", () => {
    process.env.PAYMOB_HMAC_SECRET = "s3cret";
    const h = computeHmac(obj, "TRANSACTION");
    expect(verifyHmac(obj, "TRANSACTION", h)).toBe(true);
    expect(verifyHmac({ ...obj, amount_cents: 100 }, "TRANSACTION", h)).toBe(false);
    expect(verifyHmac(obj, "TRANSACTION", null)).toBe(false);
    expect(verifyHmac(obj, "TRANSACTION", "abc")).toBe(false);
  });
});
