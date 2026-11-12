import type { DocLocale, DocPage } from "../types";

const pages: Record<DocLocale, DocPage> = {
  en: {
    slug: "/docs/operations",
    title: "Operations",
    description: "Local Compose operations, health, workers, and optional tooling.",
    sections: [
      {
        id: "stack",
        title: "Compose services",
        blocks: [
          {
            type: "table",
            headers: ["Service", "Role"],
            rows: [
              ["nginx", "Same-origin gateway"],
              ["api", "Laravel API / PHP-FPM"],
              ["web", "Next.js UI"],
              ["queue", "Redis queue worker (mail notifications)"],
              ["scheduler", "schedule:run loop (no product schedules yet)"],
              ["mariadb / redis", "Primary data and queues"],
              ["localfakemail", "Dev SMTP capture"],
            ],
          },
          { type: "status", label: "Queue worker for mail", status: "implemented" },
          { type: "status", label: "Product cron jobs in scheduler", status: "planned" },
        ],
      },
      {
        id: "health",
        title: "Health & commands",
        blocks: [
          {
            type: "list",
            items: [
              "GET /api/v1/health — API liveness",
              "GET /healthz — web process health route",
              "make up / make down / make logs / make ps",
              "make migrate — run Laravel migrations",
              "make test / make test-financial / make test-e2e",
            ],
          },
        ],
      },
      {
        id: "profiles",
        title: "Optional profiles",
        blocks: [
          {
            type: "list",
            items: [
              "antivirus — ClamAV scanner sidecar",
              "sonar — local SonarQube (does not replace security review; GitHub runners cannot reach your localhost Sonar)",
            ],
          },
          { type: "status", label: "Optional ClamAV / Sonar profiles", status: "partially_implemented" },
        ],
      },
      {
        id: "backup",
        title: "Backup & recovery",
        blocks: [
          {
            type: "paragraph",
            text: "Treat MariaDB volumes and private document storage as operator-owned. Use standard MariaDB dump/restore procedures and keep APP_KEY backups aligned with encrypted columns. See docs/operations.md in the repository for deeper notes.",
          },
        ],
      },
    ],
  },
  pt: {
    slug: "/docs/operations",
    title: "Operações",
    description: "Operações Compose locais, health, workers e tooling opcional.",
    sections: [
      {
        id: "stack",
        title: "Serviços Compose",
        blocks: [
          {
            type: "table",
            headers: ["Serviço", "Função"],
            rows: [
              ["nginx", "Gateway same-origin"],
              ["api", "API Laravel / PHP-FPM"],
              ["web", "UI Next.js"],
              ["queue", "Worker Redis (notificações de mail)"],
              ["scheduler", "Loop schedule:run (ainda sem schedules de produto)"],
              ["mariadb / redis", "Dados primários e filas"],
              ["localfakemail", "Captura SMTP de desenvolvimento"],
            ],
          },
          { type: "status", label: "Worker de fila para mail", status: "implemented" },
          { type: "status", label: "Cron jobs de produto no scheduler", status: "planned" },
        ],
      },
      {
        id: "health",
        title: "Health e comandos",
        blocks: [
          {
            type: "list",
            items: [
              "GET /api/v1/health — liveness da API",
              "GET /healthz — health do processo web",
              "make up / make down / make logs / make ps",
              "make migrate — migrações Laravel",
              "make test / make test-financial / make test-e2e",
            ],
          },
        ],
      },
      {
        id: "profiles",
        title: "Perfis opcionais",
        blocks: [
          {
            type: "list",
            items: [
              "antivirus — sidecar ClamAV",
              "sonar — SonarQube local (não substitui revisão de segurança; runners GitHub não alcançam Sonar em localhost)",
            ],
          },
          { type: "status", label: "Perfis opcionais ClamAV / Sonar", status: "partially_implemented" },
        ],
      },
      {
        id: "backup",
        title: "Backup e recuperação",
        blocks: [
          {
            type: "paragraph",
            text: "Trate volumes MariaDB e armazenamento de documentos privados como responsabilidade do operador. Use dump/restore MariaDB padrão e mantenha backups de APP_KEY alinhados com colunas encriptadas. Ver docs/operations.md no repositório para notas mais profundas.",
          },
        ],
      },
    ],
  },
};

export function getOperationsPage(locale: DocLocale): DocPage {
  return pages[locale];
}
