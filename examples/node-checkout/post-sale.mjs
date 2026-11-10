import { createHmac, randomBytes } from "node:crypto";

const baseUrl = process.env.AACT_URL ?? "http://localhost:18080";
const token = process.env.AACT_TOKEN;
const hmacSecret = process.env.AACT_HMAC_SECRET;
const referralCode = process.env.REFERRAL_CODE ?? null;

if (!token || !hmacSecret) {
  console.error("Set AACT_TOKEN and AACT_HMAC_SECRET");
  process.exit(1);
}

const body = {
  external_event_id: process.env.EXTERNAL_EVENT_ID ?? `ord-${Date.now()}`,
  event_type: "sale",
  occurred_at: new Date().toISOString(),
  amount_minor: Number(process.env.AMOUNT_MINOR ?? 10000),
  currency: process.env.CURRENCY ?? "EUR",
  referral_code: referralCode,
  metadata: { channel: "node-checkout-example" },
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
