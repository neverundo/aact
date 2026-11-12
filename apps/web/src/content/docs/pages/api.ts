import type { DocLocale, DocPage } from "../types";

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/api",
    title: "API reference",
    description: "Curated OpenAPI 0.5.0 for the portfolio surface.",
    sections: [
      {
        id: "scope",
        title: "Scope of the published contract",
        blocks: [
          {
            type: "callout",
            tone: "info",
            title: "Curated, not exhaustive",
            text: "The public OpenAPI document covers health, a subset of auth, integration events, and selected portal/admin paths. Additional /api/v1 routes exist in the application; treat OpenAPI as the demo/portfolio contract unless expanded.",
          },
          { type: "status", label: "Curated OpenAPI v0.5.0", status: "partially_implemented" },
          {
            type: "linkList",
            items: [
              {
                href: "/openapi.yaml",
                label: "Download openapi.yaml",
                description: "Served from the Next.js public folder",
              },
            ],
          },
        ],
      },
      {
        id: "conventions",
        title: "Conventions",
        blocks: [
          {
            type: "list",
            items: [
              "Base path: /api/v1 via the same-origin gateway",
              "SPA portals: Sanctum cookie session + CSRF",
              "Integrations: bearer + HMAC headers (see Integration authentication)",
              "Money: integer minor units; no floating amounts in contracts",
              "Correlation: X-Correlation-Id on responses when present",
            ],
          },
        ],
      },
      {
        id: "groups",
        title: "Tagged groups in OpenAPI",
        blocks: [
          {
            type: "table",
            headers: ["Tag", "Examples"],
            rows: [
              ["Health", "GET /api/v1/health"],
              ["Auth", "login, MFA verify"],
              ["Integration", "POST /api/v1/integration/events"],
              ["Portal", "balances, payout requests, branding"],
              ["Admin", "branding, payout approve/mark-paid, rule deactivate"],
            ],
          },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/api",
    title: "Referência API",
    description: "OpenAPI 0.5.0 curada para a superfície de portefólio.",
    sections: [
      {
        id: "scope",
        title: "Âmbito do contrato publicado",
        blocks: [
          {
            type: "callout",
            tone: "info",
            title: "Curada, não exaustiva",
            text: "O OpenAPI público cobre health, um subconjunto de auth, eventos de integração e caminhos selecionados de portal/admin. Existem mais rotas /api/v1 na aplicação; trate o OpenAPI como contrato de demo/portefólio até ser expandido.",
          },
          { type: "status", label: "OpenAPI v0.5.0 curada", status: "partially_implemented" },
          {
            type: "linkList",
            items: [
              {
                href: "/openapi.yaml",
                label: "Descarregar openapi.yaml",
                description: "Servido a partir da pasta public do Next.js",
              },
            ],
          },
        ],
      },
      {
        id: "conventions",
        title: "Convenções",
        blocks: [
          {
            type: "list",
            items: [
              "Base path: /api/v1 via gateway same-origin",
              "Portais SPA: sessão cookie Sanctum + CSRF",
              "Integrações: bearer + headers HMAC (ver Autenticação de integração)",
              "Dinheiro: minor units inteiros; sem montantes float nos contratos",
              "Correlação: X-Correlation-Id nas respostas quando presente",
            ],
          },
        ],
      },
      {
        id: "groups",
        title: "Grupos no OpenAPI",
        blocks: [
          {
            type: "table",
            headers: ["Tag", "Exemplos"],
            rows: [
              ["Health", "GET /api/v1/health"],
              ["Auth", "login, MFA verify"],
              ["Integration", "POST /api/v1/integration/events"],
              ["Portal", "balances, payout requests, branding"],
              ["Admin", "branding, payout approve/mark-paid, rule deactivate"],
            ],
          },
        ],
      },
    ],
  },
};

export function getApiPage(locale: DocLocale): DocPage {
  return pages[locale];
}
