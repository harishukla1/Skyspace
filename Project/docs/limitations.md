# Known limitations & future enhancements

Honest list of what is **not** done or is mocked in this version.

## Mocked / partial
* **SMS & OTP** — console driver only; phone verification flag exists but no OTP flow. Needs an Indian provider (MSG91, Twilio, Gupshup) with DLT-registered templates.
* **Email in development** — console driver logs messages; nothing is delivered until SMTP is configured.
* **CAPTCHA** — server verification works when configured, but no client widget is rendered yet.
* **Saved-search alerts** — users can enable the preference; there is no job that finds new matches and sends emails.
* **Maps** — embed only (no draw-on-map search, no geocoding of addresses). Owners type latitude/longitude manually.
* **Fonts** — Poppins/Inter load via `next/font/google`, which downloads at build time. On restricted networks the build falls back to system fonts; self-host the font files if builds run offline.

## Not implemented
* Payments (out of scope by brief).
* Ownership/identity **document upload** and restricted-access document vault (verification is recorded as a status by admins).
* Messaging/chat between customers and owners (contact is via enquiries, phone and email).
* Image processing (resizing/WebP conversion, EXIF stripping) — images are stored as uploaded; `next/image` optimises on delivery. Add `sharp` server-side processing before launch.
* Drag-and-drop photo reordering (move-left buttons only); bulk listing import.
* Per-state RERA enforcement — the `reraRequiredStates` setting is stored but submission does not yet require a RERA number for those states.
* Right-to-erasure automation for user accounts (manual process).
* Multi-language UI (English only), project/builder pages, price trends, EMI calculator.
* Rate limiting is in-memory per API instance; use a Redis store (`rate-limit-redis`) when running more than one instance.
* Notification preferences per channel; push notifications.

## Testing gaps
* E2E suite covers the 10 required journeys on desktop Chrome plus a mobile navigation check; it has not been run on Safari/Firefox.
* No load/performance test results yet — run `explain()` and a k6 test with production-like data volumes before launch.
* Accessibility verified by semantic markup and keyboard paths during development; no formal WCAG audit.

## Legal
Privacy policy and terms are **templates** in the CMS and must be reviewed by counsel (DPDP Act 2023, RERA, consumer protection). Seed testimonials are clearly labelled “Sample content”.
