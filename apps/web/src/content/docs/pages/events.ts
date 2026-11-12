import type { DocLocale, DocPage } from "../types";

const saleJson = `{
  "external_event_id": "ord-1001",
  "event_type": "sale",
  "occurred_at": "2026-11-10T12:00:00Z",
  "amount_minor": 10000,
  "currency": "EUR",
  "referral_code": "REF-DEMOCODE01",
  "metadata": { "channel": "node_checkout" }
}`;

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/integrations/events",
    title: "Commercial events",
    description: "POST /api/v1/integration/events — sale, refund, and chargeback payloads.",
    sections: [
      {
        id: "endpoint",
        title: "Endpoint",
        blocks: [
          {
            type: "paragraph",
            text: "POST /api/v1/integration/events on the same-origin gateway (local default http://localhost:18080).",
          },
          {
            type: "table",
            headers: ["Outcome", "HTTP"],
            rows: [
              ["New event processed", "201 Created"],
              ["Idempotent replay of the same external_event_id", "200 OK with replayed: true"],
              ["Auth / validation / business rule failures", "401 / 422 / etc. per contract"],
            ],
          },
          { type: "status", label: "Sync 200/201 responses", status: "implemented" },
          { type: "status", label: "HTTP 202 Accepted async receipt", status: "unsupported" },
        ],
      },
      {
        id: "sale",
        title: "Sale body",
        blocks: [
          {
            type: "code",
            language: "json",
            code: saleJson,
          },
          {
            type: "paragraph",
            text: "Amounts are integer minor units. Currency must match the business currency. referral_code is required for attribution when you expect a commission.",
          },
        ],
      },
      {
        id: "money",
        title: "Money & time",
        blocks: [
          {
            type: "list",
            items: [
              "amount_minor: integer ≥ 1 (no floats)",
              "currency: ISO code matching the business",
              "occurred_at: ISO-8601 timestamp used for rule effectiveness",
            ],
          },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/integrations/events",
    title: "Eventos comerciais",
    description: "POST /api/v1/integration/events — payloads de sale, refund e chargeback.",
    sections: [
      {
        id: "endpoint",
        title: "Endpoint",
        blocks: [
          {
            type: "paragraph",
            text: "POST /api/v1/integration/events no gateway same-origin (local omissão http://localhost:18080).",
          },
          {
            type: "table",
            headers: ["Resultado", "HTTP"],
            rows: [
              ["Evento novo processado", "201 Created"],
              ["Replay idempotente do mesmo external_event_id", "200 OK com replayed: true"],
              ["Falhas de auth / validação / regras", "401 / 422 / etc. conforme contrato"],
            ],
          },
          { type: "status", label: "Respostas síncronas 200/201", status: "implemented" },
          { type: "status", label: "HTTP 202 Accepted assíncrono", status: "unsupported" },
        ],
      },
      {
        id: "sale",
        title: "Body de sale",
        blocks: [
          {
            type: "code",
            language: "json",
            code: saleJson,
          },
          {
            type: "paragraph",
            text: "Montantes são inteiros em minor units. A moeda tem de coincidir com o business. referral_code é necessário para atribuição quando espera comissão.",
          },
        ],
      },
      {
        id: "money",
        title: "Dinheiro e tempo",
        blocks: [
          {
            type: "list",
            items: [
              "amount_minor: inteiro ≥ 1 (sem floats)",
              "currency: código ISO igual ao do business",
              "occurred_at: timestamp ISO-8601 usado na validade das regras",
            ],
          },
        ],
      },
    ],
  },
};

export function getEventsPage(locale: DocLocale): DocPage {
  return pages[locale];
}
