import type { DocLocale, DocPage } from "../types";

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/getting-started",
    title: "Getting started",
    description: "Run AACT locally with Docker Compose and complete a first demo flow.",
    sections: [
      {
        id: "requirements",
        title: "Requirements",
        blocks: [
          {
            type: "list",
            items: [
              "Docker and Docker Compose",
              "Make (optional but recommended)",
              "Host ports free for the gateway (default 18080) and optional mail/Sonar ports",
            ],
          },
          { type: "status", label: "Compose-based local stack", status: "implemented" },
        ],
      },
      {
        id: "setup",
        title: "Setup",
        blocks: [
          {
            type: "code",
            language: "bash",
            caption: "From the repository root",
            code: `cp .env.example .env
make setup
make seed-demo`,
          },
          {
            type: "paragraph",
            text: "Open http://localhost:18080 (or HTTP_PORT from your .env). The gateway serves the Next.js UI and proxies /api and /sanctum to Laravel.",
          },
          {
            type: "callout",
            tone: "info",
            title: "Environment variables",
            text: "Copy names from .env.example only. Never paste real APP_KEY, database passwords, or SONAR_TOKEN into public docs or commits.",
          },
        ],
      },
      {
        id: "env",
        title: "Notable env keys (names only)",
        blocks: [
          {
            type: "table",
            headers: ["Key", "Purpose"],
            rows: [
              ["APP_KEY", "Laravel application key"],
              ["HTTP_PORT", "Published nginx gateway port"],
              ["DB_*", "MariaDB database and credentials"],
              ["MAIL_*", "Dev SMTP via localfakemail"],
              ["AACT_ADMIN_TOTP_REQUIRED", "Require admin TOTP (true in production)"],
              ["AACT_FILE_SCANNER", "auto | clamav | unavailable | fake"],
              ["TRUSTED_PROXIES", "Narrow in production; see hardening docs"],
            ],
          },
        ],
      },
      {
        id: "first-flow",
        title: "First functional flow",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Sign in with the demo admin from seed-demo (see demo walkthrough in the repo)",
              "Confirm TOTP/setup if prompted",
              "Create or inspect an integration credential under Admin → Integrations (step-up required)",
              "Send a signed sale with examples/node-checkout/post-sale.mjs",
              "Inspect commercial events, commissions, and portal balances",
            ],
          },
          { type: "status", label: "Demo seeder + examples", status: "implemented" },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/getting-started",
    title: "Começar",
    description: "Correr a AACT localmente com Docker Compose e completar o primeiro fluxo demo.",
    sections: [
      {
        id: "requirements",
        title: "Requisitos",
        blocks: [
          {
            type: "list",
            items: [
              "Docker e Docker Compose",
              "Make (opcional, recomendado)",
              "Portas livres para o gateway (omissão 18080) e opcionalmente mail/Sonar",
            ],
          },
          { type: "status", label: "Stack local Compose", status: "implemented" },
        ],
      },
      {
        id: "setup",
        title: "Setup",
        blocks: [
          {
            type: "code",
            language: "bash",
            caption: "Na raiz do repositório",
            code: `cp .env.example .env
make setup
make seed-demo`,
          },
          {
            type: "paragraph",
            text: "Abra http://localhost:18080 (ou HTTP_PORT do .env). O gateway serve a UI Next.js e faz proxy de /api e /sanctum para o Laravel.",
          },
          {
            type: "callout",
            tone: "info",
            title: "Variáveis de ambiente",
            text: "Use apenas nomes a partir de .env.example. Nunca cole APP_KEY, passwords de BD ou SONAR_TOKEN reais em documentação pública ou commits.",
          },
        ],
      },
      {
        id: "env",
        title: "Chaves de env relevantes (só nomes)",
        blocks: [
          {
            type: "table",
            headers: ["Chave", "Função"],
            rows: [
              ["APP_KEY", "Chave da aplicação Laravel"],
              ["HTTP_PORT", "Porta publicada do nginx"],
              ["DB_*", "Base de dados MariaDB e credenciais"],
              ["MAIL_*", "SMTP de desenvolvimento via localfakemail"],
              ["AACT_ADMIN_TOTP_REQUIRED", "Exigir TOTP de admin (true em produção)"],
              ["AACT_FILE_SCANNER", "auto | clamav | unavailable | fake"],
              ["TRUSTED_PROXIES", "Restringir em produção; ver hardening"],
            ],
          },
        ],
      },
      {
        id: "first-flow",
        title: "Primeiro fluxo funcional",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Entrar com o admin demo do seed-demo (ver demo walkthrough no repositório)",
              "Confirmar TOTP/setup se pedido",
              "Criar ou inspecionar credencial em Admin → Integrations (exige step-up)",
              "Enviar um sale assinado com examples/node-checkout/post-sale.mjs",
              "Inspecionar eventos, comissões e saldos no portal",
            ],
          },
          { type: "status", label: "Seeder demo + examples", status: "implemented" },
        ],
      },
    ],
  },
};

export function getGettingStartedPage(locale: DocLocale): DocPage {
  return pages[locale];
}
