# Branding

Business-level white-label for the **referrer portal** and invitation experience. The admin shell stays AACT-neutral.

## Model

`business_brandings`:

- `display_name` (optional override)
- `primary_color`, `secondary_color`, `accent_color` (`#RRGGBB`)
- logo stored on disk `branding_assets` (not publicly linked under `/storage`)

Website fields:

- `favicon_path`, `logo_path`, `brand_disk`
- `favicon_source_url`, `logo_source_url`, `logo_fetched_at`

## API

Admin (auth + admin.access):

- `GET/PUT /api/v1/admin/businesses/{id}/branding`
- `POST /api/v1/admin/businesses/{id}/branding/logo` (multipart `logo`)
- `POST /api/v1/admin/websites/{id}/fetch-brand-assets`

Public asset streaming (rate-limited; `/storage` remains denied at the gateway):

- `GET /api/v1/branding/businesses/{id}/logo`
- `GET /api/v1/branding/websites/{id}/favicon|logo`
- `GET /api/v1/branding/businesses/{id}` (JSON)

Portal:

- `GET /api/v1/portal/branding?business_id=`

## UI

- Admin: `/admin/businesses/:id/branding`
- Portal applies CSS variables `--brand-primary|secondary|accent` and optional logo in the sidebar.

## Favicon fetch

Soft-fail HTTP fetch of HTML → `<link rel=icon>`, apple-touch-icon / `og:image`, else `/favicon.ico`. Failures do not block website CRUD.
