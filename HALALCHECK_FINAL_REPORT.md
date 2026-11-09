# HalalCheck engineering report

Date: 9 November 2026 (Europe/Rome)
Branch: `codex/halalcheck-completion-20261109`

## Release assessment

**LOCAL QA PASSED; PRODUCTION RELEASE BLOCKED PENDING OWNER APPROVAL AND LIVE VERIFICATION.**

The application was improved in place. Existing modified/untracked project work was preserved and incorporated into the working branch. No production database writes, synthetic production events, force pushes, database resets or production deployments were performed.

| Requirement | Status | Evidence / limitation |
|---|---|---|
| Static production build | PASS | `npm run build` validates assets and JS/TS syntax and creates `dist/` |
| Analyzer and product lookup | PASS locally | Ingredient aliases, languages, compound evidence, uncertainty, barcode identity, API failures/timeouts/cache/duplicate requests |
| Responsive frontend | PASS locally | Desktop 1440x900 and mobile 390x844 Chromium; overview screenshots inspected |
| Languages | PARTIAL | 12 existing languages preserved; Urdu switching/persistence and RTL text pass; many keys still use English fallback, listed in `reports/i18n-coverage.json` |
| PWA | PASS locally / device verification pending | Offline shell, install-prompt simulation, cache update strategy, 192/512 PNG icons; no physical Android test |
| Existing production migrations | VERIFIED HISTORY | Supabase reported both `20261031235000` and `20261104000000` applied |
| New analytics boundary migration | VALIDATED, NOT APPLIED | All migrations execute against isolated PostgreSQL; owner approval required for `20261109000000` |
| Edge Functions | BLOCKED | Authenticated Supabase function listing returned an empty list; production URLs both returned 404 |
| Private owner dashboard | PASS with local/mocked evidence; LIVE UNVERIFIED | Database rejects anon/non-admin/inactive users; browser handles empty data and 403; real owner login/membership not verified |
| Analytics ingestion | PASS in isolation; production BLOCKED | 100 synthetic events through the real handler and service-role RPC against PGlite; no hosted gateway/Auth end-to-end test |
| Dependency audit | PASS at execution time | `npm audit --audit-level=high`: 0 vulnerabilities |
| Production site | EXISTING SITE AVAILABLE | Read-only probe returned HTTP 200; new changes are not deployed |
| Vercel/GitHub release integration | UNVERIFIED | Existing origin preserved; deployment settings supplied locally, account integration not inspected/changed |

## Automated QA evidence

Final full run: **320 executions, 320 passed, 0 failed, 0 skipped** (286 Node unit/integration cases plus 34 desktop/mobile Chromium executions). Run `npm run qa:100` to reproduce. No application failure retries are enabled. Infrastructure install/network permission failures were retried with authorized network access rather than treated as passing tests.

Evidence:

- `reports/qa-summary.json`: structured totals.
- `reports/unit.tap`: per-case Node results.
- `reports/browser.json`: per-case browser results.
- `reports/desktop-overview.png`, `reports/mobile-overview.png`: rendered UI captures.
- `reports/synthetic-analytics.json`: isolated synthetic traffic results.
- `reports/production-readonly.json`: public HTTP availability probes.
- `reports/i18n-coverage.json`: explicit missing translation keys.

Failures found during development were corrected and retested: compound ingredient priority, unknown compound coverage, false certainty around flavouring, invalid barcode normalization, misleading identity text for unknown products, install button hidden-state CSS, mobile-only control availability, late camera permission, and browser-runner teardown. The new migration initially had a reserved SQL alias; executing it in PostgreSQL exposed that syntax error and it was fixed before validation. Earlier failed test runs are not included in the final passing-run total. Browser traces from failures remain local in ignored `test-results/` when retained by Playwright.

## Synthetic analytics verification

The isolated test creates a fresh in-memory PostgreSQL instance, stubs only the Supabase roles and `auth.uid()`/users schema, and executes all repository migrations. It calls the exact dependency-injected Edge ingestion handler; its database adapter executes the existing RPC under `service_role`.

100 synthetic events: 20 each of page opens, scan starts, manual searches, failed lookups and completed analyses. All five aggregate counts match. An additional 60 repeated events exercise the per-session limit; the next event is rejected. Invalid event names, sensitive metadata, wrong origins and oversized bodies are rejected. Anonymous direct ingestion, anonymous table reads, non-admin reporting, inactive admin reporting, unauthorized admin membership writes and authenticated retention calls are rejected. Authorized reporting returns the expected 160 admitted events and 101 synthetic sessions; 31-day-old data is purged.

No hosted Supabase test project was created. This validates handler/SQL integration, not the hosted network gateway, Auth login service or cron scheduler. Production received zero synthetic writes. Duplicate transport delivery is not idempotent: repeated admitted requests count separately; the browser only debounces each event name for one second.

## Principal fixes

- Escaped user ingredients, product data and saved-history values before HTML interpolation, preventing executable ingredient markup.
- Prioritized prohibited/source-dependent evidence over broad benign aliases. Unknown residual words in a compound prevent a definite permissible result. Translated ingredient evidence participates in matching.
- Restricted source-dependent promotion when qualifications are negated or uncertain. A purported plant gelatin label is not treated as confirmed gelatin evidence. Unspecified flavouring now requires verification; yogurt is uncertain for that reason rather than falsely containing pork.
- Added HALAL, HARAM and NEEDS VERIFICATION English result labels while keeping certification separate.
- Added Open Food Facts lookup, bounded retries/abort timeouts, malformed-data checks, barcode identity validation, shared pending requests and optional bounded 24-hour local caching. Existing catalogue data was preserved.
- Corrected invalid barcode normalization and ensured unknown/manual results do not claim verified product identity.
- Escaped history rendering and tolerated corrupted history JSON. Results/history update assessment labels when the language changes.
- Moved language/install/privacy controls out of the mobile-hidden sidebar, repaired hidden-state CSS, added visible keyboard focus, consent withdrawal, loading feedback and camera cleanup on navigation/visibility changes. Late permission responses now release their streams.
- Added analysis completion and language/install events, separated manual searches from camera barcode completion metrics, stripped arbitrary analytics metadata, and avoided search paths/barcodes/ingredients in analytics.
- Prepared a database boundary that grants ingestion only to `service_role`, validates minimal payloads, limits per-session event rates, keeps admin checks server-side, and reports event/session/language/device counts honestly.
- Dashboard now includes total events, browser sessions, barcode completions, manual searches, analyses, failures, daily trends and breakdowns; empty/loading/error states are visible. Reporting period labels are truthful rolling windows.
- Service worker uses network-first same-origin caching, cleans prior app caches, excludes admin/external services and avoids caching error responses. Added Android-compatible PNG icons, explicit manifest identity/scope, and no-cache service-worker headers.
- Added a static build allowlist, Vercel security headers, repeatable QA, read-only production probes and maintenance documentation.

## Database / security notes

The two applied migration files were not rewritten. The new migration preserves existing rows and schema, adjusts RPC grants/validation and aggregates, and schedules retention only if pg_cron is already present. Hosted cron availability/execution is unverified. With no pg_cron, an operator must arrange a daily privileged purge job; see README.

The new Edge ingestion implementation uses Supabase's server-only service-role environment value; browser configuration contains only public project/endpoint/publishable values. SQL privileges are the enforcement point, not the hidden dashboard URL or CORS. Anonymous ingestion is inherently susceptible to bots: per-session limits can be bypassed by rotating sessions, so comprehensive gateway abuse prevention remains a limitation.

This is a practical review, not a security guarantee. Real production Auth settings, administrator membership, retention scheduling, secrets and hosted function behavior still require verification after approval. Public registration is not offered in the UI; remote Auth signup settings were not modified.

## Files changed / added

Application: `app.js`, `analytics.js`, `config.js`, `index.html`, `styles.css`, `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`.

Analysis/data: `src/data/ingredientDatabase.js`, `src/data/universalHalalPolicy.js`, `src/utils/halalAnalyzer.js`, `src/utils/productRepository.js`, `src/models/productModel.js`, `src/i18n/index.js`.

Admin/backend: `admin/admin.js`, `admin/admin.css`, `admin/index.html`, existing `admin/config.js`, `supabase/functions/analytics-event/index.ts`, `supabase/functions/admin-stats/index.ts`, new `supabase/functions/_shared/analytics-handler.ts`, new `supabase/migrations/20261109000000_analytics_boundary.sql`. Existing untracked Supabase configuration/security-repair migration was preserved.

Tooling/documentation: `package.json`, `package-lock.json`, `.gitignore`, `playwright.config.cjs`, `vercel.json`, `scripts/build.cjs`, `scripts/serve.cjs`, `scripts/qa.cjs`, `scripts/icons.cjs`, `scripts/probe.cjs`, `tests/qa/*`, `tests/browser/*`, updated `tests/halalAnalyzer.test.js`, preserved existing browser integration tests, `reports/*`, `README.md`, this report.

## Git and release

A dedicated local branch was created. Existing work remains in the branch; nothing was reset. The implementation is prepared for a local commit after the final QA run. No push or pull request was created, and no Vercel production release was triggered. The final chat response records any resulting local commit identifier.

Owner approval is required before applying `20261109000000_analytics_boundary.sql`, deploying either Edge Function, changing production function secrets, or deploying Vercel production assets. README provides the concrete order and validation commands. Deploying the new ingestion function before its migration creates a short rejection window; deploy these as one coordinated maintenance change. Verify the owner account and live authorization before treating the dashboard as operational. Missing translations and physical-device verification remain explicit unfinished work.
