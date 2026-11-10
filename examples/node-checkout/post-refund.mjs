import { createHmac, randomBytes } from "node:crypto";

const baseUrl = process.env.AACT_URL ?? "http://localhost:18080";
const token = process.env.AACT_TOKEN;
const hmacSecret = process.env.AACT_HMAC_SECRET;
const relatedExternalEventId = process.env.RELATED_EXTERNAL_EVENT_ID;

if (!token || !hmacSecret || !relatedExternalEventId) {
  console.error(
    "Set AACT_TOKEN, AACT_HMAC_SECRET and RELATED_EXTERNAL_EVENT_ID",
  );
  process.exit(1);
}

const body = {
  external_event_id: process.env.EXTERNAL_EVENT_ID ?? `ref-${Date.now()}`,
  event_type: process.env.EVENT_TYPE ?? "refund",
  related_external_event_id: relatedExternalEventId,
  occurred_at: new Date().toISOString(),
  amount_minor: Number(process.env.AMOUNT_MINOR ?? 5000),
  currency: process.env.CURRENCY ?? "EUR",
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
