import type { DocLocale, DocPage } from "../types";

const refundJson = `{
  "external_event_id": "refund-1001",
  "event_type": "refund",
  "related_external_event_id": "ord-1001",
  "occurred_at": "2026-11-10T13:00:00Z",
  "amount_minor": 2000,
  "currency": "EUR"
}`;

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/integrations/refunds",
    title: "Refunds and chargebacks",
    description: "Proportional commission reversals via new ledger entries.",
    sections: [
      {
        id: "model",
        title: "Model",
        blocks: [
          {
            type: "paragraph",
            text: "Send event_type refund or chargeback with related_external_event_id pointing at the original sale’s external_event_id. Reversal amount is proportional to refund/original sale amounts, capped by remaining reversible commission and available balance (payable minus open payout reservations).",
          },
          { type: "status", label: "Proportional reversal + append-only ledger", status: "implemented" },
        ],
      },
      {
        id: "payload",
        title: "Example payload",
        blocks: [
          { type: "code", language: "json", code: refundJson },
          {
            type: "paragraph",
            text: "Use examples/node-checkout/post-refund.mjs locally. History is never deleted; reversals post new balanced ledger entries.",
          },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/integrations/refunds",
    title: "Reembolsos e chargebacks",
    description: "Reversões proporcionais de comissão via novas entradas de ledger.",
    sections: [
      {
        id: "model",
        title: "Modelo",
        blocks: [
          {
            type: "paragraph",
            text: "Envie event_type refund ou chargeback com related_external_event_id a apontar para o external_event_id da sale original. O montante de reversão é proporcional a refund/venda original, limitado pela comissão ainda reversível e pelo saldo available (payable menos reservas de payout abertas).",
          },
          { type: "status", label: "Reversão proporcional + ledger append-only", status: "implemented" },
        ],
      },
      {
        id: "payload",
        title: "Exemplo de payload",
        blocks: [
          { type: "code", language: "json", code: refundJson },
          {
            type: "paragraph",
            text: "Use examples/node-checkout/post-refund.mjs localmente. O histórico nunca é apagado; reversões publicam novas entradas de ledger equilibradas.",
          },
        ],
      },
    ],
  },
};

export function getRefundsPage(locale: DocLocale): DocPage {
  return pages[locale];
}
