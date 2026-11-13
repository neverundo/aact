import type { DocLocale, DocPage } from "../types";

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs",
    title: "AACT documentation",
    description:
      "Self-hosted commission attribution and settlement for multiple businesses.",
    sections: [
      {
        id: "what",
        title: "What AACT does",
        blocks: [
          {
            type: "paragraph",
            text: "AACommissionTool (AACT) receives commercial events from external systems, attributes sales to referrers, applies versioned commission rules, keeps an append-only ledger in minor units, and helps operators review payout requests. Payments are recorded after they are executed outside the platform.",
          },
          {
            type: "list",
            items: [
              "Admin configures businesses, websites, rules, and integration credentials",
              "Referrers onboard with payment data and documents, then receive referral codes",
              "External checkouts/POS send authenticated sale, refund, and chargeback events",
              "Portal shows commissions, available/reserved/payable balances, and payout requests",
            ],
          },
          { type: "status", label: "Core product flows", status: "implemented" },
        ],
      },
      {
        id: "non-goals",
        title: "What AACT does not do",
        blocks: [
          {
            type: "callout",
            tone: "limit",
            title: "Money movement",
            text: "AACT does not execute bank transfers or card charges. It records external settlements after an operator marks a payout as paid.",
          },
          {
            type: "list",
            items: [
              "Not a certified invoicing or fiscal filing system",
              "Not a payment service provider and does not handle PAN/CVV",
              "Does not claim GDPR certification or “exactly-once” network delivery",
            ],
          },
          { type: "status", label: "Bank rails / fiscal certification", status: "unsupported" },
        ],
      },
      {
        id: "maturity",
        title: "Maturity",
        blocks: [
          {
            type: "paragraph",
            text: "Phases 0–5 of the portfolio slice are implemented for local and demo use. Production deployments are operator-owned: TLS, admin TOTP, trusted proxies, and secret rotation must be configured deliberately.",
          },
          { type: "status", label: "Local/demo portfolio", status: "implemented" },
          { type: "status", label: "Turnkey production SaaS packaging", status: "planned" },
        ],
      },
      {
        id: "glossary",
        title: "Glossary",
        blocks: [
          {
            type: "table",
            headers: ["Term", "Meaning"],
            rows: [
              ["Business", "Commercial tenant with currency and payout threshold"],
              ["Website", "Storefront/channel scoped under a business"],
              ["Source", "Stable integration channel id used in event idempotency"],
              ["Integration credential", "Bearer token + HMAC secret bound to business, website, source"],
              ["Referrer", "Approved member who receives commissions"],
              ["Referral code", "Code passed as referral_code on sale events"],
              ["Event", "Normalized sale, refund, or chargeback payload"],
              ["Commission", "Attributed amount with rule snapshot in minor units"],
              ["Payable", "Ledger balance of the referrer payable account"],
              ["Reserved", "Sum of pending/approved payout request amounts"],
              ["Available", "Payable minus reserved"],
              ["Payout", "Request to settle available balance externally"],
            ],
          },
        ],
      },
      {
        id: "next",
        title: "Where to go next",
        blocks: [
          {
            type: "linkList",
            items: [
              {
                href: "/docs/getting-started",
                label: "Getting started",
                description: "Local Compose setup and first demo flow",
              },
              {
                href: "/docs/integrations/checkout",
                label: "Checkout integration",
                description: "How external paid sales become commission events",
              },
              {
                href: "/docs/api",
                label: "API reference",
                description: "Curated OpenAPI surface",
              },
            ],
          },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs",
    title: "Documentação AACT",
    description:
      "Atribuição e liquidação de comissões self-hosted para vários businesses.",
    sections: [
      {
        id: "what",
        title: "O que a AACT faz",
        blocks: [
          {
            type: "paragraph",
            text: "A AACommissionTool (AACT - Agnostically-Assigning-a-Comission Tool) recebe eventos comerciais de sistemas externos, atribui vendas a referrers, aplica regras de comissão versionadas, mantém um ledger append-only em unidades menores e ajuda operadores a rever pedidos de payout. Os pagamentos são registados depois de executados fora da plataforma.",
          },
          {
            type: "list",
            items: [
              "Admin configura businesses, websites, regras e credenciais de integração",
              "Referrers fazem onboarding com dados de pagamento e documentos, depois recebem códigos",
              "Checkouts/POS externos enviam eventos autenticados de sale, refund e chargeback",
              "O portal mostra comissões, saldos available/reserved/payable e pedidos de payout",
            ],
          },
          { type: "status", label: "Fluxos principais do produto", status: "implemented" },
        ],
      },
      {
        id: "non-goals",
        title: "O que a AACT não faz",
        blocks: [
          {
            type: "callout",
            tone: "limit",
            title: "Movimentação de dinheiro",
            text: "A AACT não executa transferências bancárias nem cobranças de cartão. Regista liquidações externas depois de um operador marcar um payout como paid.",
          },
          {
            type: "list",
            items: [
              "Não é um sistema de faturação certificado nem de submissão fiscal",
              "Não é um PSP e não trata PAN/CVV",
              "Não reivindica certificação RGPD nem entrega “exactly-once” na rede",
            ],
          },
          { type: "status", label: "Rails bancários / certificação fiscal", status: "unsupported" },
        ],
      },
      {
        id: "maturity",
        title: "Maturidade",
        blocks: [
          {
            type: "paragraph",
            text: "As fases 0–5 do slice de portefólio estão implementadas para uso local e demo. Deployments de produção são da responsabilidade do operador: TLS, TOTP de admin, proxies de confiança e rotação de segredos devem ser configurados de propósito.",
          },
          { type: "status", label: "Portefólio local/demo", status: "implemented" },
          { type: "status", label: "Empacotamento SaaS de produção", status: "planned" },
        ],
      },
      {
        id: "glossary",
        title: "Glossário",
        blocks: [
          {
            type: "table",
            headers: ["Termo", "Significado"],
            rows: [
              ["Business", "Tenant comercial com moeda e limiar de payout"],
              ["Website", "Canal/loja sob um business"],
              ["Source", "Id estável do canal de integração na idempotência de eventos"],
              ["Credencial de integração", "Bearer + HMAC ligados a business, website e source"],
              ["Referrer", "Membro aprovado que recebe comissões"],
              ["Referral code", "Código enviado como referral_code nos eventos de sale"],
              ["Event", "Payload normalizado de sale, refund ou chargeback"],
              ["Commission", "Montante atribuído com snapshot da regra em minor units"],
              ["Payable", "Saldo do ledger na conta payable do referrer"],
              ["Reserved", "Soma dos pedidos de payout pending/approved"],
              ["Available", "Payable menos reserved"],
              ["Payout", "Pedido para liquidar saldo available externamente"],
            ],
          },
        ],
      },
      {
        id: "next",
        title: "Seguinte",
        blocks: [
          {
            type: "linkList",
            items: [
              {
                href: "/docs/getting-started",
                label: "Começar",
                description: "Setup Compose local e primeiro fluxo demo",
              },
              {
                href: "/docs/integrations/checkout",
                label: "Integração checkout",
                description: "Como vendas pagas se tornam eventos de comissão",
              },
              {
                href: "/docs/api",
                label: "Referência API",
                description: "Superfície OpenAPI curada",
              },
            ],
          },
        ],
      },
    ],
  },
};

export function getOverviewPage(locale: DocLocale): DocPage {
  return pages[locale];
}
