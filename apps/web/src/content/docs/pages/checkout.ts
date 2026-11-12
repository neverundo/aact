import type { DocLocale, DocPage } from "../types";

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/integrations/checkout",
    title: "Checkout integration",
    description:
      "Adding ?ref=CODE to a link does not create attribution by itself. Your origin system must preserve the code and send a signed event after payment confirmation.",
    sections: [
      {
        id: "critical",
        title: "Critical rule",
        blocks: [
          {
            type: "callout",
            tone: "warning",
            title: "Referral links are not tracking pixels",
            text: "AACT does not observe storefront visits. Your application must read ?ref=, keep it through cart/checkout, and submit it as referral_code on the sale event after the sale is paid.",
          },
        ],
      },
      {
        id: "flow",
        title: "Real flow",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Visitor opens shop.example with ?ref=CODE",
              "External system associates CODE with the cart/order",
              "External payment completes in the origin PSP",
              "Origin backend validates payment-provider confirmation",
              "Paid sale is persisted in the origin system",
              "Integration event is built (sync send today; durable outbox is planned)",
              "Event is POSTed to AACT with bearer + HMAC",
              "AACT responds 201 (new) or 200 (replayed) after persistence/processing",
              "Commission is calculated when attribution and rules match",
              "Later refunds/chargebacks are separate events",
            ],
          },
          { type: "status", label: "Server-to-server sale ingest", status: "implemented" },
          { type: "status", label: "Persist-before-ack outbox + HTTP 202", status: "planned" },
        ],
      },
      {
        id: "rules",
        title: "Integrator rules",
        blocks: [
          {
            type: "list",
            items: [
              "Never put bearer tokens or HMAC secrets in the browser",
              "A success page or GET query param is not payment proof",
              "The browser must not decide commission amounts",
              "Do not send PAN/CVV to AACT",
              "Do not fail an already-paid sale because AACT is temporarily unavailable — retry later",
              "Retries must reuse the same external_event_id; mint a new timestamp and nonce each attempt",
              "HTTP 201/200 means the event was accepted/replayed, not that payout is complete",
            ],
          },
        ],
      },
      {
        id: "admin-setup",
        title: "Admin setup",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Create business and website",
              "Create a commission rule for that website",
              "Create an integration credential (step-up required) and store token + hmac_secret securely (shown once)",
              "Use a stable source such as node_checkout",
            ],
          },
        ],
      },
      {
        id: "example",
        title: "Local example",
        blocks: [
          {
            type: "code",
            language: "bash",
            code: `export AACT_URL=http://localhost:18080
export AACT_TOKEN=…          # from admin create/rotate
export AACT_HMAC_SECRET=…    # shown once
export REFERRAL_CODE=REF-DEMOCODE01
node examples/node-checkout/post-sale.mjs`,
          },
          {
            type: "paragraph",
            text: "See also examples/offline-sale for non-ecommerce channels.",
          },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/integrations/checkout",
    title: "Integração de checkout",
    description:
      "Adicionar ?ref=CODE a um link não cria atribuição por si. O sistema de origem deve preservar o código e enviar um evento assinado após confirmação de pagamento.",
    sections: [
      {
        id: "critical",
        title: "Regra crítica",
        blocks: [
          {
            type: "callout",
            tone: "warning",
            title: "Links de referral não são pixels de tracking",
            text: "A AACT não observa visitas à loja. A aplicação deve ler ?ref=, mantê-lo no carrinho/checkout e enviá-lo como referral_code no evento de sale depois da venda estar paga.",
          },
        ],
      },
      {
        id: "flow",
        title: "Fluxo real",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Visitante abre shop.example com ?ref=CODE",
              "Sistema externo associa CODE ao carrinho/encomenda",
              "Pagamento externo conclui no PSP de origem",
              "Backend de origem valida a confirmação do fornecedor de pagamento",
              "Venda paga é persistida no sistema de origem",
              "Evento de integração é construído (envio síncrono hoje; outbox durável é planned)",
              "Evento é enviado à AACT com bearer + HMAC",
              "AACT responde 201 (novo) ou 200 (replay) após persistência/processamento",
              "Comissão é calculada quando atribuição e regras coincidem",
              "Refunds/chargebacks posteriores são eventos separados",
            ],
          },
          { type: "status", label: "Ingestão sale servidor-a-servidor", status: "implemented" },
          { type: "status", label: "Outbox persist-before-ack + HTTP 202", status: "planned" },
        ],
      },
      {
        id: "rules",
        title: "Regras do integrador",
        blocks: [
          {
            type: "list",
            items: [
              "Nunca coloque tokens bearer ou segredos HMAC no browser",
              "Página de sucesso ou query GET não é prova de pagamento",
              "O browser não decide montantes de comissão",
              "Não envie PAN/CVV para a AACT",
              "Não falhe uma venda já paga porque a AACT está temporariamente indisponível — faça retry",
              "Retries devem reutilizar o mesmo external_event_id; novo timestamp e nonce em cada tentativa",
              "HTTP 201/200 significa evento aceite/replay — não payout concluído",
            ],
          },
        ],
      },
      {
        id: "admin-setup",
        title: "Setup no admin",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Criar business e website",
              "Criar regra de comissão para esse website",
              "Criar credencial de integração (exige step-up) e guardar token + hmac_secret (mostrados uma vez)",
              "Usar um source estável como node_checkout",
            ],
          },
        ],
      },
      {
        id: "example",
        title: "Exemplo local",
        blocks: [
          {
            type: "code",
            language: "bash",
            code: `export AACT_URL=http://localhost:18080
export AACT_TOKEN=…          # do create/rotate no admin
export AACT_HMAC_SECRET=…    # mostrado uma vez
export REFERRAL_CODE=REF-DEMOCODE01
node examples/node-checkout/post-sale.mjs`,
          },
          {
            type: "paragraph",
            text: "Ver também examples/offline-sale para canais não ecommerce.",
          },
        ],
      },
    ],
  },
};

export function getCheckoutPage(locale: DocLocale): DocPage {
  return pages[locale];
}
