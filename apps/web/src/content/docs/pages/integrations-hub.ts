import type { DocLocale, DocPage } from "../types";

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/integrations",
    title: "Integrations",
    description: "Server-to-server commercial events from checkouts, POS, and offline sales.",
    sections: [
      {
        id: "model",
        title: "Integration model",
        blocks: [
          {
            type: "paragraph",
            text: "AACT is checkout-provider agnostic. Your origin system confirms payment, then posts a normalized event with bearer + HMAC authentication. Business and website are derived from the credential, never trusted from the client payload.",
          },
          { type: "status", label: "HMAC ingestion endpoint", status: "implemented" },
          {
            type: "status",
            label: "Async inbox / HTTP 202 accept",
            status: "unsupported",
          },
          {
            type: "callout",
            tone: "warning",
            title: "Sync responses today",
            text: "Successful ingest returns HTTP 201 (new) or 200 (replay). That acknowledges persistence and in-request processing — not that funds are paid out.",
          },
        ],
      },
      {
        id: "guides",
        title: "Guides in this section",
        blocks: [
          {
            type: "linkList",
            items: [
              {
                href: "/docs/integrations/checkout",
                label: "Checkout narrative",
                description: "End-to-end flow from referral link to event",
              },
              {
                href: "/docs/integrations/events",
                label: "Events",
                description: "Payload shapes and response codes",
              },
              {
                href: "/docs/integrations/authentication",
                label: "Authentication",
                description: "Bearer token and HMAC signature",
              },
              {
                href: "/docs/integrations/idempotency",
                label: "Idempotency & retries",
                description: "external_event_id, nonce, replay behaviour",
              },
              {
                href: "/docs/integrations/refunds",
                label: "Refunds & chargebacks",
                description: "Proportional reversals",
              },
            ],
          },
        ],
      },
      {
        id: "examples",
        title: "Repository examples",
        blocks: [
          {
            type: "list",
            items: [
              "examples/node-checkout — post-sale.mjs and post-refund.mjs",
              "examples/offline-sale — offline / POS style sale helper",
            ],
          },
          { type: "status", label: "Executable examples", status: "implemented" },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/integrations",
    title: "Integrações",
    description: "Eventos comerciais servidor-a-servidor a partir de checkouts, POS e vendas offline.",
    sections: [
      {
        id: "model",
        title: "Modelo de integração",
        blocks: [
          {
            type: "paragraph",
            text: "A AACT é agnóstica ao fornecedor de checkout. O sistema de origem confirma o pagamento e depois envia um evento normalizado com autenticação bearer + HMAC. Business e website vêm da credencial, nunca do payload do cliente.",
          },
          { type: "status", label: "Endpoint de ingestão HMAC", status: "implemented" },
          {
            type: "status",
            label: "Inbox assíncrono / HTTP 202",
            status: "unsupported",
          },
          {
            type: "callout",
            tone: "warning",
            title: "Respostas síncronas hoje",
            text: "Ingestão bem-sucedida devolve HTTP 201 (novo) ou 200 (replay). Isso confirma persistência e processamento no pedido — não que o dinheiro foi pago ao referrer.",
          },
        ],
      },
      {
        id: "guides",
        title: "Guias nesta secção",
        blocks: [
          {
            type: "linkList",
            items: [
              {
                href: "/docs/integrations/checkout",
                label: "Narrativa de checkout",
                description: "Fluxo de ponta a ponta do link de referral ao evento",
              },
              {
                href: "/docs/integrations/events",
                label: "Eventos",
                description: "Formas de payload e códigos de resposta",
              },
              {
                href: "/docs/integrations/authentication",
                label: "Autenticação",
                description: "Bearer token e assinatura HMAC",
              },
              {
                href: "/docs/integrations/idempotency",
                label: "Idempotência e retries",
                description: "external_event_id, nonce, comportamento de replay",
              },
              {
                href: "/docs/integrations/refunds",
                label: "Reembolsos e chargebacks",
                description: "Reversões proporcionais",
              },
            ],
          },
        ],
      },
      {
        id: "examples",
        title: "Exemplos no repositório",
        blocks: [
          {
            type: "list",
            items: [
              "examples/node-checkout — post-sale.mjs e post-refund.mjs",
              "examples/offline-sale — helper de venda offline / POS",
            ],
          },
          { type: "status", label: "Exemplos executáveis", status: "implemented" },
        ],
      },
    ],
  },
};

export function getIntegrationsHubPage(locale: DocLocale): DocPage {
  return pages[locale];
}
