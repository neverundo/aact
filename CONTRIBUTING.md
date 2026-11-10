# Contributing

## Working method

1. Read `docs/product-spec.md` and relevant ADRs in `docs/adr/`.
2. Implement one phase/increment at a time.
3. Deliver working code, tests, docs updates, and a short summary.
4. Do not commit, push, or deploy unless explicitly asked.

## Conventions

- Code, schemas, endpoints, and technical docs: English.
- UI copy: pt-PT, i18n-ready.
- Domain term in code: `referrer`.
- Persist timestamps in UTC.
- Prefer modular monolith boundaries over new packages/services.

## Validation before hand-off

```bash
cd apps/api && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse
cd apps/web && npm run typecheck && npm run lint && npm run build
docker compose -f compose.yaml config --quiet
```

When Compose is up:

```bash
make test
make test-financial
make lint
make seed-demo
make test-e2e
```

See `docs/demo-walkthrough.md` and `docs/hardening.md`.
