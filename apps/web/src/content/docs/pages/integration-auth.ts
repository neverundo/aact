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
        title: "Signing sketches",
        blocks: [
          {
            type: "code",
            language: "typescript",
            caption: "TypeScript",
            code: `import { createHmac, randomBytes } from "node:crypto";

const rawBody = JSON.stringify(body);
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = randomBytes(16).toString("hex");
const signature = createHmac("sha256", hmacSecret)
  .update(\`\${timestamp}.\${nonce}.\${rawBody}\`)
  .digest("hex");`,
          },
          {
            type: "code",
            language: "php",
            caption: "PHP",
            code: `$rawBody = json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
$timestamp = (string) time();
$nonce = bin2hex(random_bytes(16));
$signature = hash_hmac('sha256', $timestamp.'.'.$nonce.'.'.$rawBody, $hmacSecret);`,
          },
          {
            type: "linkList",
            items: [
              {
                href: "/docs/integrations/client",
                label: "Full client & notifier",
                description: "Ready-to-adapt PHP and TypeScript helpers",
              },
            ],
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
        title: "Esboços de assinatura",
        blocks: [
          {
            type: "code",
            language: "typescript",
            caption: "TypeScript",
            code: `import { createHmac, randomBytes } from "node:crypto";

const rawBody = JSON.stringify(body);
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = randomBytes(16).toString("hex");
const signature = createHmac("sha256", hmacSecret)
  .update(\`\${timestamp}.\${nonce}.\${rawBody}\`)
  .digest("hex");`,
          },
          {
            type: "code",
            language: "php",
            caption: "PHP",
            code: `$rawBody = json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
$timestamp = (string) time();
$nonce = bin2hex(random_bytes(16));
$signature = hash_hmac('sha256', $timestamp.'.'.$nonce.'.'.$rawBody, $hmacSecret);`,
          },
          {
            type: "linkList",
            items: [
              {
                href: "/docs/integrations/client",
                label: "Cliente e notifier completos",
                description: "Helpers PHP e TypeScript prontos a adaptar",
              },
            ],
          },
        ],
      },
    ],
  },
};

export function getIntegrationAuthPage(locale: DocLocale): DocPage {
  return pages[locale];
}
