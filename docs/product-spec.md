# Projeto: AACommissionTool — Agnostic Commission Attribution & Settlement Platform

Atua como Principal Software Engineer com experiência em Laravel, Next.js, APIs REST, segurança aplicacional e integridade de sistemas financeiros.

Implementa um mini-produto de portefólio funcional, executável e documentado. Não quero apenas scaffolding, diagramas ou CRUDs sem regras de negócio.

O nome AACommissionTool é provisório. Working title in this repository: **AACT**.

---

## 1. Objetivo do produto

Construir uma plataforma self-hosted e API-first que permita:

1. Um administrador configurar negócios e websites.
2. Convidar referers por email.
3. Os referers completarem o registo e submeterem dados de pagamento.
4. O administrador aprovar o referer e os dados de pagamento.
5. Os referers obterem códigos, links e QR codes de referência.
6. Sistemas externos enviarem eventos comerciais autenticados.
7. A plataforma calcular comissões através de regras versionadas.
8. As comissões serem registadas num ledger interno auditável.
9. Os referers acumularem saldo até um limiar configurável.
10. Os referers submeterem documentos para solicitar pagamentos.
11. O administrador validar documentos e registar pagamentos efetuados externamente.

A plataforma NÃO movimenta dinheiro nem executa transferências bancárias.

Deve ser independente de Stripe, Shopify, WooCommerce ou qualquer fornecedor específico.

Uma venda pode ter origem num checkout, POS, CRM, reserva, contrato ou confirmação de pagamento. A plataforma recebe um evento normalizado, sem precisar de conhecer o sistema de origem.

---

## 2. Forma de trabalhar

Antes de alterar código:

1. Inspeciona o repositório existente.
2. Identifica tecnologias, configurações e convenções já presentes.
3. Não elimines nem substituas ficheiros existentes sem necessidade.
4. Apresenta um plano curto, organizado por fases.
5. Regista decisões relevantes em Architecture Decision Records.
6. Começa a implementar a primeira fase executável.

Não tentes implementar todo o produto numa única passagem.

Em cada fase:

- entrega código funcional;
- adiciona testes;
- executa os comandos de validação disponíveis;
- corrige os problemas encontrados;
- atualiza a documentação;
- termina com um resumo dos ficheiros alterados, comandos executados, limitações e próximo passo.

Não afirmes que testes passaram se não os executaste.

Se não conseguires executar algum comando, explica o motivo e fornece o comando necessário.

Não contornes falhas de segurança para fazer os testes passar.

Não deixes funcionalidades simuladas apresentadas como funcionalidades reais.

Não faças commits, pushes, deploys ou operações destrutivas sem autorização.

### Convenções

- Código, classes, tabelas, endpoints e documentação técnica principal em inglês.
- Interface inicial em pt-PT, preparada para internacionalização.
- Usar `referrer` no código.
- Datas persistidas em UTC.
- Evitar overengineering: modular monolith, não microserviços.
- Não introduzir packages sem uma justificação concreta.

---

## 3. Stack e arquitetura

### Backend

- Laravel numa versão estável e suportada.
- PHP numa versão suportada e compatível.
- Laravel Sanctum.
- MariaDB.
- Redis.
- Laravel Queues, Notifications e Scheduler.
- Policies, Gates, Form Requests e API Resources.
- Services/Actions para regras de negócio.
- Pest ou PHPUnit, escolhendo uma abordagem consistente.
- Larastan/PHPStan.
- Laravel Pint.

### Frontend

Uma aplicação Next.js com duas áreas:

- `/admin`
- `/portal`

Tecnologias:

- Next.js App Router.
- TypeScript em modo strict.
- Tailwind CSS.
- shadcn/ui.
- lucide-react.
- React Hook Form e Zod quando adequados.
- TanStack Query para server state, se justificar simplificação.

O frontend não deve duplicar regras de autorização ou regras financeiras do backend.

### Infraestrutura

Docker Compose com serviços separados:

- nginx;
- api/php-fpm;
- web/nextjs;
- queue worker;
- scheduler;
- mariadb;
- redis;
- localfakemail (https://github.com/neverundo/localfakemail), apenas em desenvolvimento;
- serviço de análise antivírus para documentos;
- sonarqube, num profile opcional;
- PostgreSQL dedicado ao SonarQube, numa versão suportada pelo mesmo.

O worker e o scheduler devem reutilizar a imagem da aplicação Laravel.

Não usar MariaDB como base de dados do SonarQube.

### Versões

Seleciona versões estáveis compatíveis no momento da implementação.

Regista as versões escolhidas em `docs/versions.md`.

Não uses tags `latest`.

Inclui lockfiles e configurações reproduzíveis.

### Estrutura sugerida

```text
apps/
  api/
  web/
infra/
  docker/
  nginx/
  sonar/
docs/
  adr/
examples/
  node-checkout/
  offline-sale/
.github/
  workflows/
compose.yaml
.env.example
README.md
```

---

## 4. Autenticação: separar utilizadores e integrações

### Portais web

Usar Laravel Sanctum com sessão e cookies seguros para as interfaces próprias.

Arquitetura preferida:

- Next.js e Laravel expostos pela mesma origem através do Nginx.
- `/api/*` e `/sanctum/*` encaminhados para Laravel.
- Restantes rotas encaminhadas para Next.js.
- Inicialização de CSRF através de `/sanctum/csrf-cookie`.
- Pedidos mutáveis protegidos por CSRF.

Configuração:

- Cookie de sessão `HttpOnly`.
- `Secure` em produção.
- `SameSite` adequado ao fluxo, preferencialmente `Lax`.
- Cookie host-only, sem domínio excessivamente abrangente.
- Regenerar identificador de sessão após autenticação.
- Invalidar sessão no logout.
- Política explícita de expiração e inatividade.
- Não guardar credenciais em localStorage ou sessionStorage.
- O cookie de CSRF pode ser legível pelo cliente; o de sessão não.

Páginas e respostas com dados privados não podem ser colocadas em caches públicos ou partilhados.

As verificações de routing no Next.js são apenas UX. A autorização efetiva ocorre sempre no Laravel.

### Integrações externas

Usar identidades próprias de integração, distintas dos utilizadores humanos.

Cada integração pertence a:

- um business;
- um website ou âmbito explicitamente definido;
- uma source estável.

Autenticação com:

- bearer token com scopes;
- assinatura HMAC obrigatória para ingestão de eventos.

Implementar:

- expiração;
- revogação;
- rotação;
- last used timestamp;
- apresentação da credencial apenas na criação;
- associação inequívoca ao business e à source.

O bearer token deve ser guardado como hash.

O segredo HMAC deve ser guardado cifrado, porque é necessário para verificar assinaturas.

Nunca reutilizar passwords ou sessões de administradores como credenciais de integração.

A rotação de credenciais não pode alterar a identidade da source nem quebrar a idempotência.

---

## 5. Segurança de autenticação e 2FA

Implementar:

- login;
- logout;
- recuperação de password;
- alteração de password;
- verificação de email;
- listagem e revogação de sessões;
- 2FA por email;
- 2FA TOTP através de authenticator app;
- recovery codes;
- step-up authentication para operações sensíveis.

Usar implementações mantidas e bibliotecas adequadas. Não implementar criptografia proprietária.

### Passwords

- Hashing com Argon2id, se suportado pelo ambiente escolhido.
- Política de comprimento e suporte a passphrases.
- Não impor regras arbitrárias de composição sem necessidade.
- Rate limiting por IP e identificador de conta.
- Respostas que evitem enumeração de utilizadores.
- Tokens de recuperação com validade e utilização única.
- Revogação apropriada de sessões após alterações sensíveis.

### Fluxo de login com 2FA

O primeiro fator não pode criar uma sessão plenamente autenticada.

Fluxo:

1. Validar email e password.
2. Criar um challenge de autenticação temporário e restrito.
3. Validar o segundo fator.
4. Só então criar a sessão autenticada definitiva.

O challenge deve:

- expirar;
- ter limite de tentativas;
- estar associado ao utilizador e ao contexto de autenticação;
- não permitir acesso a endpoints de negócio;
- ser inutilizado após sucesso.

### TOTP

Implementar:

- setup com QR code gerado localmente;
- confirmação de um código antes da ativação;
- segredo cifrado em repouso;
- janela temporal limitada;
- proteção contra reutilização do mesmo timestep;
- atualização concorrencialmente segura do último timestep aceite.

Nunca:

- enviar o segredo TOTP para serviços externos;
- escrever o segredo em logs;
- considerar o setup concluído antes da confirmação.

### OTP por email

Implementar:

- código aleatório;
- validade curta;
- número máximo de tentativas;
- limites de reenvio;
- invalidação do código anterior após reenvio;
- armazenamento protegido contra brute force offline;
- consumo único.

O email OTP é um mecanismo de menor garantia do que TOTP e deve ser documentado dessa forma.

### Políticas

- Administradores: TOTP obrigatório em produção.
- Referers: pelo menos um método de 2FA antes de operações financeiras sensíveis.
- Email OTP não pode servir de fallback silencioso para contornar TOTP obrigatório.
- Alterar ou remover MFA exige reautenticação e validação do fator atual, ou um fluxo explícito de recuperação.
- Recovery codes aleatórios, guardados como hash e apresentados uma única vez.
- Consumo de recovery codes deve ser atómico.

Para administradores sem MFA configurado, permitir apenas um estado restrito de setup, sem acesso administrativo.

### Step-up authentication

Exigir autenticação recente para:

- alterar dados de pagamento;
- revelar dados bancários completos;
- criar ou rodar credenciais de integração;
- alterar métodos MFA;
- iniciar processamento de pagamentos;
- confirmar pagamentos como efetuados.

Documentar a validade temporal desse step-up.

---

## 6. Modelo de autorização e isolamento

O MVP é uma instalação com vários businesses, não uma plataforma SaaS completa com billing.

Mesmo assim, deve existir isolamento rigoroso de dados por business.

### Papéis

- `platform_admin`: reservado a operações globais explícitas.
- `business_admin`: acesso apenas aos businesses atribuídos.
- `referrer`: acesso apenas ao próprio perfil e participações autorizadas.
- `integration`: acesso apenas aos scopes e business/source associados.

Não depender apenas de esconder botões.

Implementar:

- Policies;
- scopes de queries;
- validação de pertença de recursos;
- testes de IDOR/BOLA;
- proteção de listagens, exports, downloads e jobs.

Nunca confiar num `business_id` recebido do cliente sem validar a autorização.

Nas integrações, derivar o business e a source das credenciais autenticadas.

Relações entre website, regra, referer, venda e payout devem impedir referências cruzadas entre businesses.

Usar constraints e foreign keys compostas quando adequado.

O acesso global de platform admin deve ser explícito, auditável e nunca resultar de um fallback permissivo.

---

## 7–28. Domínio, finanças, API, UI, hardening, testes, docs

As secções detalhadas do brief original aplicam-se integralmente e incluem:

- entidades mínimas (identidade, comissões/eventos, ledger, payouts, MFA, audit);
- convites/onboarding com estados separados e GET que não consome convite;
- dados de pagamento versionados + uploads privados com quarentena antivírus;
- códigos/links/QR sem tracking cookies no MVP;
- dinheiro em minor units / basis points / EUR; regras versionadas com precedência;
- contrato `POST /api/v1/integration/events` + HMAC/nonce/idempotência;
- ledger append-only equilibrado; ciclo de comissões; refunds/chargebacks; settlement manual;
- API REST `/api/v1`, OpenAPI, admin UI, portal UI, acessibilidade;
- Nginx/CSP/hardening; Docker multi-stage; audit/privacy/observability;
- testes obrigatórios (MariaDB para integridade financeira); CI + Sonar local honesto;
- documentação e exemplos `node-checkout` / `offline-sale`;
- fora de âmbito: PSP, MLM, multi-touch, microserviços, FX settlement, etc.

Detalhe normativo adicional vive também nos ADRs e documentos por tema sob `docs/` à medida que cada fase é implementada.

---

## 29. Fases de implementação

### Fase 0 — Fundação executável

Entregar: estrutura, ADRs, Docker Compose, Laravel, Next.js, Nginx, MariaDB, Redis, localfakemail, healthchecks, testes, CI inicial, README.

Critério: instalação limpa levanta a aplicação e executa testes básicos.

### Fase 1 — Identidade, MFA e isolamento

Critério: nenhum utilizador acede fora do seu âmbito; MFA não contornável.

### Fase 2 — Convites e onboarding

Critério: referer percorre convite → aprovação.

### Fase 3 — Ingestão, regras e ledger

Critério: retries/concorrência não duplicam comissões/movimentos.

### Fase 4 — Refunds e settlement

Critério: ciclo financeiro mantém invariantes.

### Fase 5 — Qualidade e apresentação

E2E, hardening, Sonar, docs finais, exemplos, demo.

---

## 30. Definition of Done

Uma funcionalidade só está concluída quando tem implementação real, validação, autorização, erros, testes, auditoria quando necessária, UI se aplicável, docs, sem segredos/bypasses, compatível com Docker. Núcleo financeiro: transações, idempotência, concorrência, invariantes, reversões sem apagar histórico.

---

## 31. Utilização deste ficheiro

Tratar `docs/product-spec.md` + `docs/adr/` como especificação de referência.

Em cada sessão seguinte, indicar apenas a fase ou incremento a executar.

Versões pinning: `docs/versions.md`.

### Progresso

- Fase 0: concluída
- Fase 1: concluída (auth/MFA/isolamento + UI login/segurança)
- Fase 2: concluída (convites → pagamento versionado → documentos em quarentena → aprovação → referral codes/QR)
- Fase 3: concluída (integrações HMAC + eventos idempotentes → regras bps → ledger equilibrado; suite MariaDB)
- Fase 4: concluída (refund/chargeback proporcional + payout requests + settlement ledger; invariantes MariaDB)
- Fase 5: concluída (Playwright E2E, hardening/CSP, OpenAPI, demo seed, exemplos, Sonar/coverage honesto, docs de apresentação)
- Produto portfolio: fases 0–5 concluídas
