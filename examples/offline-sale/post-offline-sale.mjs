import { createHmac, randomBytes } from "node:crypto";

/**
 * Offline / POS-style sale: same signed integration contract as online checkout.
 * Capture referral_code at till time; post when connectivity returns (idempotent on external_event_id).
 */

const baseUrl = process.env.AACT_URL ?? "http://localhost:18080";
const token = process.env.AACT_TOKEN;
const hmacSecret = process.env.AACT_HMAC_SECRET;
const referralCode = process.env.REFERRAL_CODE ?? "REF-DEMOCODE01";

if (!token || !hmacSecret) {
  console.error("Set AACT_TOKEN and AACT_HMAC_SECRET (from make seed-demo output)");
  process.exit(1);
}

const body = {
  external_event_id:
    process.env.EXTERNAL_EVENT_ID ?? `pos-${Date.now()}-${randomBytes(3).toString("hex")}`,
  event_type: "sale",
  occurred_at: process.env.OCCURRED_AT ?? new Date().toISOString(),
  amount_minor: Number(process.env.AMOUNT_MINOR ?? 2500),
  currency: process.env.CURRENCY ?? "EUR",
  referral_code: referralCode,
  metadata: {
    channel: "offline-sale",
    till_id: process.env.TILL_ID ?? "till-1",
    operator: process.env.OPERATOR ?? "demo",
  },
};

const rawBody = JSON.stringify(body);
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = randomBytes(16).toString("hex");
const signature = createHmac("sha256", hmacSecret)
  .update(`${timestamp}.${nonce}.${rawBody}`)
  .digest("hex");

const response = await fetch(`${baseUrl}/api/v1/integration/events`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-AACT-Timestamp": timestamp,
    "X-AACT-Nonce": nonce,
    "X-AACT-Signature": signature,
  },
  body: rawBody,
});

const payload = await response.json();
console.log(response.status, payload);
