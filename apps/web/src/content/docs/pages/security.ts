import type { DocLocale, DocPage } from "../types";

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/security",
    title: "Security",
    description: "Public security practices for operators and integrators.",
    sections: [
      {
        id: "web",
        title: "Web authentication",
        blocks: [
          {
            type: "list",
            items: [
              "First-party admin and portal use Sanctum cookie sessions on the same origin",
              "CSRF protection for cookie-authenticated mutations",
              "Credentials are not stored in localStorage",
              "MFA options include TOTP, email OTP, and recovery codes",
              "Administrators should enable TOTP; production deployments should require it",
              "Sensitive actions (reveal IBAN, rotate credentials, mark payout paid) require step-up re-authentication",
            ],
          },
          { type: "status", label: "Sanctum + MFA + step-up", status: "implemented" },
        ],
      },
      {
        id: "integrations",
        title: "Integration security",
        blocks: [
          {
            type: "list",
            items: [
              "Separate integration identities from human users",
              "HMAC over timestamp.nonce.rawBody with constant-time compare",
              "Nonce uniqueness and timestamp skew limits",
              "Credential create/rotate requires recent step-up",
            ],
          },
        ],
      },
      {
        id: "data",
        title: "Data protection",
        blocks: [
          {
            type: "list",
            items: [
              "Business-scoped authorization on admin APIs",
              "Payment method payloads encrypted at rest; APIs expose masks by default",
              "Private documents streamed only to authorized sessions after clean scan",
              "Referrer payouts require MFA enrollment",
            ],
          },
        ],
      },
      {
        id: "deploy",
        title: "Deployment recommendations",
        blocks: [
          {
            type: "list",
            items: [
              "Terminate TLS; enable HSTS at the edge",
              "Set AACT_ADMIN_TOTP_REQUIRED=true",
              "Narrow TRUSTED_PROXIES",
              "Use a real file scanner in production (clamav profile), not fake",
              "Rotate integration secrets and APP_KEY backups carefully",
            ],
          },
          {
            type: "callout",
            tone: "limit",
            title: "No false compliance claims",
            text: "This page describes implemented controls. It is not a GDPR certification, penetration-test report, or guarantee against all attacks.",
          },
        ],
      },
      {
        id: "disclosure",
        title: "Vulnerability disclosure",
        blocks: [
          {
            type: "paragraph",
            text: "Follow SECURITY.md in the repository: contact the maintainer privately for issues that expose credentials, personal data, or RCE. Do not open public issues for those classes of findings.",
          },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/security",
    title: "Segurança",
    description: "Práticas públicas de segurança para operadores e integradores.",
    sections: [
      {
        id: "web",
        title: "Autenticação web",
        blocks: [
          {
            type: "list",
            items: [
              "Admin e portal first-party usam sessões cookie Sanctum no same origin",
              "Proteção CSRF para mutações autenticadas por cookie",
              "Credenciais não são guardadas em localStorage",
              "MFA inclui TOTP, email OTP e recovery codes",
              "Administradores devem ativar TOTP; em produção deve ser obrigatório",
              "Ações sensíveis (revelar IBAN, rodar credenciais, mark paid) exigem step-up",
            ],
          },
          { type: "status", label: "Sanctum + MFA + step-up", status: "implemented" },
        ],
      },
      {
        id: "integrations",
        title: "Segurança de integração",
        blocks: [
          {
            type: "list",
            items: [
              "Identidades de integração separadas dos utilizadores humanos",
              "HMAC sobre timestamp.nonce.rawBody com comparação constant-time",
              "Unicidade de nonce e limites de skew de timestamp",
              "Create/rotate de credenciais exige step-up recente",
            ],
          },
        ],
      },
      {
        id: "data",
        title: "Proteção de dados",
        blocks: [
          {
            type: "list",
            items: [
              "Autorização com âmbito de business nas APIs admin",
              "Payloads de pagamento encriptados em repouso; APIs expõem máscaras por omissão",
              "Documentos privados só para sessões autorizadas após scan limpo",
              "Payouts de referrer exigem MFA enrolada",
            ],
          },
        ],
      },
      {
        id: "deploy",
        title: "Recomendações de deployment",
        blocks: [
          {
            type: "list",
            items: [
              "Terminar TLS; ativar HSTS na edge",
              "Definir AACT_ADMIN_TOTP_REQUIRED=true",
              "Restringir TRUSTED_PROXIES",
              "Usar scanner real em produção (perfil clamav), não fake",
              "Rodar segredos de integração e backups de APP_KEY com cuidado",
            ],
          },
          {
            type: "callout",
            tone: "limit",
            title: "Sem falsas reivindicações de compliance",
            text: "Esta página descreve controlos implementados. Não é certificação RGPD, relatório de pentest nem garantia contra todos os ataques.",
          },
        ],
      },
      {
        id: "disclosure",
        title: "Divulgação de vulnerabilidades",
        blocks: [
          {
            type: "paragraph",
            text: "Siga SECURITY.md no repositório: contacte o maintainer em privado para issues que exponham credenciais, dados pessoais ou RCE. Não abra issues públicas para essas classes.",
          },
        ],
      },
    ],
  },
};

export function getSecurityPage(locale: DocLocale): DocPage {
  return pages[locale];
}
