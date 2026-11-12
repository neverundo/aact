import type { DocLocale, DocPage } from "../types";

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/integrations/authentication",
    title: "Integration authentication",
    description: "Bearer token plus HMAC over timestamp, nonce, and raw body.",
    sections: [
      {
        id: "headers",
        title: "Required headers",
        blocks: [
          {
            type: "table",
            headers: ["Header", "Value"],
            rows: [
              ["Authorization", "Bearer <token>"],
              ["Content-Type", "application/json"],
              ["X-AACT-Timestamp", "Unix seconds"],
              ["X-AACT-Nonce", "Unique random string per request"],
              [
                "X-AACT-Signature",
                "hex(hmac_sha256(secret, timestamp + '.' + nonce + '.' + rawBody))",
              ],
            ],
          },
          { type: "status", label: "Bearer + HMAC + nonce replay protection", status: "implemented" },
        ],
      },
      {
        id: "signing",
        title: "Signing notes",
        blocks: [
          {
            type: "list",
            items: [
              "Sign the exact raw body bytes you send — do not re-serialize after signing",
              "Timestamp must be within the configured skew window",
              "Nonces are unique per credential; reuse yields 422",
              "Rotate credentials via admin (step-up). New secrets do not break historical idempotency keys",
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Server only",
            text: "Credentials must live in your backend or secrets manager. Browser “try it” tokens are not supported.",
          },
        ],
      },
      {
        id: "snippet",
        title: "Node signing sketch",
        blocks: [
          {
            type: "code",
            language: "javascript",
            code: `const rawBody = JSON.stringify(body);
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = randomBytes(16).toString("hex");
const signature = createHmac("sha256", hmacSecret)
  .update(\`\${timestamp}.\${nonce}.\${rawBody}\`)
  .digest("hex");`,
          },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/integrations/authentication",
    title: "Autenticação de integração",
    description: "Bearer token mais HMAC sobre timestamp, nonce e raw body.",
    sections: [
      {
        id: "headers",
        title: "Headers obrigatórios",
        blocks: [
          {
            type: "table",
            headers: ["Header", "Valor"],
            rows: [
              ["Authorization", "Bearer <token>"],
              ["Content-Type", "application/json"],
              ["X-AACT-Timestamp", "Segundos Unix"],
              ["X-AACT-Nonce", "String aleatória única por pedido"],
              [
                "X-AACT-Signature",
                "hex(hmac_sha256(secret, timestamp + '.' + nonce + '.' + rawBody))",
              ],
            ],
          },
          { type: "status", label: "Bearer + HMAC + proteção de replay por nonce", status: "implemented" },
        ],
      },
      {
        id: "signing",
        title: "Notas de assinatura",
        blocks: [
          {
            type: "list",
            items: [
              "Assine exactamente os bytes do raw body enviados — não re-serialize depois de assinar",
              "O timestamp tem de estar na janela de skew configurada",
              "Nonces são únicos por credencial; reutilizar devolve 422",
              "Rodar credenciais no admin (step-up). Novos segredos não quebram chaves de idempotência históricas",
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Só no servidor",
            text: "Credenciais vivem no backend ou gestor de segredos. Tokens “try it” no browser não são suportados.",
          },
        ],
      },
      {
        id: "snippet",
        title: "Esboço de assinatura Node",
        blocks: [
          {
            type: "code",
            language: "javascript",
            code: `const rawBody = JSON.stringify(body);
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = randomBytes(16).toString("hex");
const signature = createHmac("sha256", hmacSecret)
  .update(\`\${timestamp}.\${nonce}.\${rawBody}\`)
  .digest("hex");`,
          },
        ],
      },
    ],
  },
};

export function getIntegrationAuthPage(locale: DocLocale): DocPage {
  return pages[locale];
}
