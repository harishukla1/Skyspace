# Sky Space Realty

A full-stack real estate platform for India: residential and commercial property to buy, sell or rent, with listing moderation, lead management, site-visit scheduling and an admin console.

| Layer | Stack |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 |
| Backend | Node.js · Express 5 · REST `/api/v1` · OpenAPI 3 / Swagger UI |
| Data | MongoDB · Mongoose 8 |
| Shared | `@skyspace/shared`: Zod schemas, permission matrix, state machines, ₹/IST formatters |
| Tests | Vitest · Supertest + in-memory MongoDB · Testing Library · Playwright |

Brand colour `#0C84B8` and the logo come from `Images/Sky_Space_Realty_logo.pdf` (the extracted assets are in `apps/web/public/brand/`).

## Quick start (local)

Prerequisites: Node.js ≥ 20.11 and npm ≥ 10. MongoDB is optional, because the repo can run one for you.

```bash
npm install
cp .env.example .env            # then set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET (32+ random chars each)

npm run dev:db                  # terminal 1: local MongoDB on :27017 (skip if you already run MongoDB)
npm run seed -- --reset         # sample cities, listings, leads, visits and accounts
npm run dev                     # API on :4000, web on :3000
```

* Website: http://localhost:3000
* API docs (Swagger): http://localhost:4000/api/docs
* Health: http://localhost:4000/health

### Sample accounts (seed data, development only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@skyspace.test` | `Admin@12345` |
| Agent | `riya.agent@skyspace.test` (also `arjun.`, `sneha.`) | `Password@123` |
| Owner | `owner@skyspace.test`, `lakshmi.owner@skyspace.test` | `Password@123` |
| Customer | `customer@skyspace.test` | `Password@123` |

Sample listing photos are Unsplash images and are labelled as samples. Sample testimonials are shown with a "Sample content" tag.

In development, emails (password reset, verification, notifications) are **not sent**. They are printed to the API log.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API (tsx watch) + web (next dev) |
| `npm run dev:db` | Persistent local MongoDB via mongodb-memory-server (`apps/api/.memdb`) |
| `npm run seed -- --reset` | Drop and re-seed the dev database (refuses in production) |
| `npm run typecheck` | `tsc --noEmit` in every workspace |
| `npm run lint` | ESLint (web) |
| `npm test` | Shared unit tests, API integration tests, web component tests |
| `npm run test:e2e` | Playwright journeys against a running, freshly seeded stack (`PW_CHANNEL=chrome` uses installed Chrome) |
| `npm run build` | Production builds (API with tsup, web with `next build`, standalone output) |
| `npm run openapi -w @skyspace/api` | Regenerate `docs/openapi.json` |

## What's included

* **Public site:** home with hero search; Buy, Rent and Commercial pages; search with 25+ URL-driven filters and sorting; SEO property pages (gallery, map, amenities, rental terms, RERA no., enquiry and site-visit forms, share, report, similar listings); city and locality pages; agents; sell/rent-out; about, contact, FAQ, privacy, terms; sitemap and robots; 404.
* **Customer:** dashboard, profile, shortlist, saved searches, enquiries, site visits (cancel or accept a reschedule), notifications, password and session settings, deactivation.
* **Owner / agent:** dashboard and performance, a 6-step listing wizard (drafts, photos, review and submit), listing detail with status actions and history, approval status, enquiries/leads (status, notes, follow-ups), site-visit management, agent profile.
* **Admin:** live KPI dashboard and charts, approval queue, property moderation (approve, reject, suspend, feature, verify, assign agent), users and roles, agents (invite/promote), leads with CSV export, site visits, categories, cities and localities, homepage/content CMS, analytics, complaints, audit log, platform settings.

## Documentation

| Doc | Contents |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Requirements summary, architecture and component diagrams, security model, workflows, versions |
| [docs/database-schema.md](docs/database-schema.md) | Collections, relationships, every index and the query it serves, dashboard aggregation logic, retention |
| [docs/permissions.md](docs/permissions.md) | Role-permission matrix and ownership rules |
| [docs/api-specification.md](docs/api-specification.md) + [docs/openapi.json](docs/openapi.json) | REST conventions, endpoint index, full OpenAPI 3 spec |
| [docs/deployment.md](docs/deployment.md) | Environment, builds, MongoDB Atlas, backups, HTTPS/CORS, monitoring, integrations, CI |
| [docs/limitations.md](docs/limitations.md) | What is mocked or not yet built |

## Real vs mocked

| Feature | Status |
|---|---|
| Auth, RBAC, listings, search, leads, visits, admin, CMS, audit | Real, backed by MongoDB |
| Image upload | Real: local disk (dev) or any S3-compatible bucket (prod) |
| Email | Real via SMTP when configured; console log in dev |
| CAPTCHA | Real server-side verification when configured; no client widget yet |
| Maps | Google/Mapbox embed when a key is set; otherwise an OpenStreetMap link |
| SMS / OTP | **Mock (console only)** |
| Saved-search email alerts | **Not implemented** (the preference is stored) |
| Payments | Out of scope |
