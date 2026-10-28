# Deployment & operations

The web app and API deploy separately. Recommended topology: `www.example.in` → Next.js, `api.example.in` → Express, MongoDB Atlas, S3-compatible bucket + CDN. Using a shared parent domain lets auth cookies work with `SameSite=Lax` (`COOKIE_DOMAIN=.example.in`).

## 1. Environment
Copy `.env.example`. Required in production:

| Variable | Notes |
|---|---|
| `NODE_ENV=production` | Enables `Secure` cookies and HSTS |
| `MONGODB_URI` | Atlas SRV URI with a least-privilege DB user |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` | ≥ 32 random chars each, **different** (startup fails otherwise) |
| `FRONTEND_ORIGIN` | Exact web origin(s), comma-separated (CORS allow-list + email links) |
| `API_PUBLIC_URL` | Public API origin (used for local-storage image URLs) |
| `COOKIE_DOMAIN` | e.g. `.example.in` |
| `STORAGE_DRIVER=s3` + `OBJECT_STORAGE_*` | Bucket, keys, region, optional endpoint (R2/Spaces/MinIO), public CDN URL |
| `EMAIL_PROVIDER=smtp` + `SMTP_*`, `EMAIL_FROM` | Any SMTP (SES, SendGrid, Postmark…) |
| `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET` | Optional Turnstile/reCAPTCHA for public forms (client widget sends `X-Captcha-Token`) |
| Web: `NEXT_PUBLIC_API_BASE_URL`, `API_INTERNAL_URL`, `NEXT_PUBLIC_SITE_URL`, `OBJECT_STORAGE_PUBLIC_URL` (build-time, for `next/image`) | |
| Web maps: `NEXT_PUBLIC_MAPS_PROVIDER`, `NEXT_PUBLIC_MAPS_API_KEY` | Browser key **restricted by HTTP referrer** |

Never put secrets in `NEXT_PUBLIC_*` variables. Store secrets in the host’s secret manager (AWS Secrets Manager, Render/Railway/Vercel env, Doppler, etc.).

## 2. Build & run
```bash
npm ci
npm run build                     # tsup → apps/api/dist, next build → apps/web/.next (standalone)
# API
NODE_ENV=production node apps/api/dist/server.js
# Web
npm run start -w @skyspace/web    # or run apps/web/.next/standalone/server.js
```
Health check: `GET /health` → `200 {status:"ok"}` when MongoDB is connected, `503` otherwise. Point load-balancer health checks here.

The API handles `SIGTERM`/`SIGINT`: stops accepting connections, drains in-flight requests (15 s max), closes the MongoDB pool.

## 3. Database
1. Create an Atlas cluster (M10+ for production; region `ap-south-1` Mumbai).
2. Create a DB user with `readWrite` on the app database only; restrict network access to your API hosts.
3. Indexes are declared in the models. Run `syncIndexes` once on deploy (the seed script does this; in production run a one-off `node -e` or enable `autoIndex` only in a migration job).
4. **Do not run the seed script against production** — it refuses unless `--force` is passed.
5. Create the first admin: register normally, then in a Mongo shell `db.users.updateOne({email:'you@company.in'},{$addToSet:{roles:'admin'}})`.

### Backups & recovery
* Atlas continuous cloud backup with point-in-time restore (retain ≥ 7 days PITR, daily snapshots ≥ 30 days).
* Object storage: enable bucket versioning + lifecycle rules.
* Quarterly restore drill into a staging cluster; verify `/health` and a sample search.

## 4. HTTPS, CORS, headers
* Terminate TLS at the load balancer/CDN; redirect HTTP→HTTPS. The API sets `trust proxy` (1 hop) so rate limiting sees client IPs.
* CORS allows only `FRONTEND_ORIGIN` with credentials.
* API: helmet defaults. Web: HSTS (prod), nosniff, `X-Frame-Options`, referrer and permissions policies, `noindex` on dashboards.

## 5. Logging & monitoring
* API logs are structured JSON (pino) with cookies/authorization/passwords redacted. Ship stdout to your log platform.
* Add error monitoring (e.g. Sentry) by initialising it in `apps/api/src/server.ts` and `apps/web/src/app/layout.tsx`; DSNs via env vars.
* Alert on: `/health` failures, 5xx rate, p95 latency, MongoDB connections, 429 spikes.

## 6. Scheduled jobs (to configure)
| Job | How |
|---|---|
| Lead retention | Call `anonymiseOldLeads(24)` from `apps/api/src/modules/enquiries/enquiry.service.ts` daily |
| Saved-search alerts | Not implemented yet (preference is stored) — see limitations |

## 7. External integrations
| Integration | Status | Setup |
|---|---|---|
| Email | **Real** via SMTP; `console` driver in dev logs messages and reports `delivered:false` | `EMAIL_PROVIDER=smtp` + SMTP vars |
| Image storage | **Real** S3-compatible driver; `local` driver for dev | `STORAGE_DRIVER=s3` + bucket vars; add CDN domain to `OBJECT_STORAGE_PUBLIC_URL` |
| CAPTCHA | **Real** server verification (Turnstile/reCAPTCHA); client widget not yet added | set provider + secret, add widget to enquiry/visit forms |
| Maps | Embed (Google Maps Embed API / Mapbox); falls back to an OpenStreetMap link | provider + restricted browser key |
| SMS / OTP | **Mock only** (console). Adapter interface in `services/sms.ts` | implement MSG91/Twilio adapter before enabling |
| Analytics / error monitoring | Not wired | add provider SDKs |

## 8. CI
`.github/workflows/ci.yml` runs install, typecheck, lint, unit + integration tests (in-memory MongoDB) and production builds on every push/PR. End-to-end tests need a running seeded stack and are run locally or in a separate job.
