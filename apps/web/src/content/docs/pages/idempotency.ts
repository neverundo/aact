import type { DocLocale, DocPage } from "../types";

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/integrations/idempotency",
    title: "Idempotency and retries",
    description: "Safe retries without double commissions.",
    sections: [
      {
        id: "keys",
        title: "Idempotency key",
        blocks: [
          {
            type: "paragraph",
            text: "Commercial events are unique on (business_id, source, external_event_id). The business and source come from the credential. Replaying the same triple returns the prior result with HTTP 200 and replayed: true.",
          },
          { type: "status", label: "Event + commission + ledger idempotency", status: "implemented" },
        ],
      },
      {
        id: "retry",
        title: "Retry guidance",
        blocks: [
          {
            type: "list",
            items: [
              "On timeout or 5xx, retry with the same external_event_id",
              "Generate a new X-AACT-Timestamp and X-AACT-Nonce every attempt",
              "Re-sign the same raw body (or rebuild identical JSON bytes)",
              "Treat 409/422 as non-retryable without fixing the payload",
              "Respect 429 rate limits with backoff",
            ],
          },
          {
            type: "callout",
            tone: "info",
            title: "Idempotent effects ≠ exactly-once delivery",
            text: "The network can deliver duplicates. AACT makes effects idempotent; it does not claim exactly-once transport.",
          },
          { type: "status", label: "Exactly-once network guarantee", status: "unsupported" },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/integrations/idempotency",
    title: "Idempotência e retries",
    description: "Retries seguros sem comissões duplicadas.",
    sections: [
      {
        id: "keys",
        title: "Chave de idempotência",
        blocks: [
          {
            type: "paragraph",
            text: "Eventos comerciais são únicos em (business_id, source, external_event_id). Business e source vêm da credencial. Reenviar o mesmo triplo devolve o resultado anterior com HTTP 200 e replayed: true.",
          },
          { type: "status", label: "Idempotência de evento + comissão + ledger", status: "implemented" },
        ],
      },
      {
        id: "retry",
        title: "Orientação de retry",
        blocks: [
          {
            type: "list",
            items: [
              "Em timeout ou 5xx, retry com o mesmo external_event_id",
              "Gere novo X-AACT-Timestamp e X-AACT-Nonce em cada tentativa",
              "Reassine o mesmo raw body (ou JSON bytes idênticos)",
              "Trate 409/422 como não retry sem corrigir o payload",
              "Respeite 429 com backoff",
            ],
          },
          {
            type: "callout",
            tone: "info",
            title: "Efeitos idempotentes ≠ entrega exactly-once",
            text: "A rede pode entregar duplicados. A AACT torna os efeitos idempotentes; não reivindica transporte exactly-once.",
          },
          { type: "status", label: "Garantia de rede exactly-once", status: "unsupported" },
        ],
      },
    ],
  },
};

export function getIdempotencyPage(locale: DocLocale): DocPage {
  return pages[locale];
}
