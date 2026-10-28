# API specification

* **Base URL:** `/api/v1`
* **Machine-readable spec:** [`openapi.json`](./openapi.json) (OpenAPI 3.0.3, generated from the Zod schemas by `npm run openapi -w @skyspace/api`)
* **Interactive docs:** `GET /api/docs` (Swagger UI) on a running API

## Conventions
| Topic | Rule |
|---|---|
| Format | JSON in/out (`multipart/form-data` for image upload). Amounts are integer INR. Timestamps ISO-8601 UTC. |
| Auth | httpOnly cookies set by `/auth/login|register|refresh`. Non-browser clients may send `Authorization: Bearer <access token>`. |
| CSRF | `GET /auth/csrf` → `{ csrfToken }`; send it as `X-CSRF-Token` on every POST/PATCH/PUT/DELETE made with cookies. |
| Errors | `{ "error": { "code", "message", "details?": [{ "path", "message" }] } }`. Codes: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `FORBIDDEN`/`CSRF_FAILED` 403, `NOT_FOUND` 404, `CONFLICT`/`INVALID_TRANSITION` 409, `UNPROCESSABLE` 422, `ACCOUNT_LOCKED` 423, `RATE_LIMITED` 429, `INTERNAL` 500 (no stack traces). |
| Pagination | `page` ≥ 1, `limit` 1–50 → `{ items, page, limit, total, totalPages }` |
| Access | Records the caller may not see return **404** (not 403) to avoid revealing IDs. |

## Endpoint index
See `openapi.json` for parameters, bodies and responses. Each operation documents authentication, required permission and roles, access rule, pagination and CSRF.

| Group | Endpoints |
|---|---|
| Auth | `GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `POST /auth/resend-verification` |
| Properties | `GET /properties` (search), `GET /properties/{slug}`, `GET /properties/{id}/similar`, `POST /properties`, `PATCH /properties/{id}`, `DELETE /properties/{id}` (archive), `POST /properties/{id}/submit`, `POST /properties/{id}/status`, `POST|PATCH /properties/{id}/images`, `DELETE /properties/{id}/images/{imageId}`, `POST /properties/{id}/report` |
| Owner/agent | `GET /owner/properties`, `GET /owner/properties/{id}`, `GET /owner/enquiries`, `GET /owner/site-visits`, `GET /owner/reports`, `GET /agent/enquiries`, `GET /agent/site-visits`, `GET|PATCH /agent/profile`, `GET /agent/reports` |
| Account | `GET|PATCH /users/me`, `POST /users/me/password`, `POST /users/me/logout-all`, `POST /users/me/deactivate`, shortlist (`GET`, `GET /ids`, `POST|DELETE /{propertyId}`), saved searches CRUD, `GET /users/me/enquiries`, `GET /users/me/site-visits`, notifications (`GET`, `POST /{id}/read`, `POST /read-all`) |
| Leads | `POST /enquiries`, `GET /enquiries/{id}`, `PATCH /enquiries/{id}/status`, `POST /enquiries/{id}/notes`, `PATCH /enquiries/{id}/assignment` |
| Visits | `POST /site-visits`, `PATCH /site-visits/{id}/status`, `PATCH /site-visits/{id}/reschedule` |
| Public content | `GET /content/home`, `GET /content/site`, `GET /content/sitemap`, `POST /content/contact`, `POST /content/newsletter`, `GET /cities`, `GET /cities/{slug}`, `GET /categories`, `GET /agents`, `GET /agents/{slug}` |
| Admin | dashboard; properties (list, detail, approve, publish, reject, suspend, status, feature, verification, agent); users (list, detail, status, roles); agents (list, create/promote, performance); enquiries (list, CSV export); site-visits; categories CRUD; cities CRUD; content; settings; reports; audit-logs |
| Ops | `GET /health` (outside `/api/v1`) |

### Search parameters (`GET /properties`)
`q, city, state, locality, pinCode, project, propertyId, transactionType (sale|rent), category (residential|commercial), type (csv), minPrice, maxPrice, bedrooms (csv; 4 = 4+), minBathrooms, minArea, maxArea (sq.ft), furnishing (csv), possession, possessionBy, condition, parking, amenities (csv, all must match), postedWithin (days), listedBy, verified, lat, lng, radiusKm (≤50), sort (relevance|newest|price_asc|price_desc|area_asc|area_desc), page, limit (≤50)`. `q` matching `SSR\d+` searches by property ID; a 6-digit `q` searches by PIN code.
