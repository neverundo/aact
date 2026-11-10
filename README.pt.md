**Idioma:** [English](README.md) | **Português**

# AACT — Agnostically-Assigning-a-Comission Tool

Plataforma self-hosted, API-first, de atribuição, controlo e liquidação de comissões.

A plataforma regista eventos comerciais de qualquer sistema de origem, calcula comissões com regras versionadas, mantém um livro-razão interno auditável e permite confirmação manual de pagamentos externos. **Não** movimenta dinheiro nem se integra com um PSP/loja específica.

Brief canónico do produto: [`docs/product-spec.md`](docs/product-spec.md).

## Porque existe (portefólio)

Demonstra um modular monolith com invariantes financeiros reais: Sanctum MFA, isolamento por negócio, ingestão de integrações com HMAC, regras de comissão versionadas (bps), livro-razão append-only e equilibrado, clawbacks proporcionais em reembolsos e liquidação de pagamentos — executável via Docker Compose.

## Stack

| Camada | Versão |
| --- | --- |
| Laravel | 13.40 (skeleton 13.11) |
| PHP (contentores) | 8.4.27 |
| Sanctum | 4.3 |
| Next.js | 16.4 |
| React | 19.3 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| MariaDB | 11.4.5 |
| Redis | 7.4.2 |
| Nginx | 1.27.5 |
| Node (contentores) | 22.16.0 |
| localfakemail | [neverundo/localfakemail](https://github.com/neverundo/localfakemail) `main` (build git no Compose) |
| ClamAV (perfil opcional) | 1.4.2 |
| SonarQube (perfil opcional) | 25.5.0 + PostgreSQL 16.8 |
| Playwright (E2E) | 1.56 |

## Estrutura do repositório

```text
apps/api          API Laravel
apps/web          Next.js (/admin, /portal)
e2e/              Playwright (fluxos via gateway)
examples/         node-checkout + offline-sale
infra/docker      Dockerfiles (multi-stage)
infra/nginx       Reverse proxy (+ exemplo TLS de produção)
infra/sonar       Configuração do projeto Sonar
docs/             Spec, ADRs, OpenAPI, runbooks
compose.yaml      Stack local
```

## Início rápido

```bash
cp .env.example .env
make setup
make seed-demo
```

- App: [http://localhost:18080](http://localhost:18080)
- localfakemail: [http://localhost:18025](http://localhost:18025)

Health: `GET /api/v1/health` · `GET /up` · `GET /healthz`

Walkthrough: [`docs/demo-walkthrough.md`](docs/demo-walkthrough.md).

## Comandos comuns

```bash
make up
make down
make migrate
make seed-demo
make test
make test-financial
make test-e2e
make lint
make coverage-api
make sonar-up
make sonar-scan   # precisa de SONAR_TOKEN + Sonar local
```

### Utilizadores de demonstração (apenas local)

| Email | Password | Notas |
| --- | --- | --- |
| `platform@aact.test` | `platform-passphrase` | TOTP `JBSWY3DPEHPK3PXP` |
| `admin@aact.test` | `admin-passphrase` | TOTP `JBSWY3DPEHPK3PXP` |
| `referrer@aact.test` | `referrer-passphrase` | referrer do portal |

## Fases de implementação

| Fase | Estado |
| --- | --- |
| 0 Foundation | Concluída |
| 1 Identity / MFA / isolation | Concluída |
| 2 Invitations / onboarding | Concluída |
| 3 Ingestion / rules / ledger | Concluída |
| 4 Refunds / settlement | Concluída |
| 5 Quality / presentation | Concluída |

## Documentação

- [`docs/product-spec.md`](docs/product-spec.md)
- [`docs/demo-walkthrough.md`](docs/demo-walkthrough.md)
- [`docs/openapi.yaml`](docs/openapi.yaml)
- [`docs/hardening.md`](docs/hardening.md)
- [`docs/operations.md`](docs/operations.md)
- [`docs/local-development.md`](docs/local-development.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/testing.md`](docs/testing.md)
- [`docs/sonar.md`](docs/sonar.md)
- [`docs/adr/`](docs/adr/)
