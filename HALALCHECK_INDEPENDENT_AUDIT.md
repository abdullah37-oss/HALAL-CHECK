# HalalCheck Independent Final Readiness Audit

Date: 9 November 2026  
Branch: `codex/halalcheck-completion-20261109`  
Commit: `f339b3a` (`Harden HalalCheck analysis, analytics and PWA with reproducible QA`)

## Executive summary

The local application is well covered by deterministic and browser QA, and the reported 320-execution result was independently reproduced. The production deployment is not ready: the live site serves an older build, both configured Supabase Edge Function URLs return HTTP 404, and the new analytics-boundary migration is still pending. The remote migration-history command could not authenticate because the configured CLI database login role received a password-authentication failure.

**Final decision: NO-GO.**

## Repository and claim verification

| Claim | Independent result | Evidence |
|---|---|---|
| Branch and commit | VERIFIED | `git branch --show-current` -> `codex/halalcheck-completion-20261109`; `git rev-parse --short HEAD` -> `f339b3a` |
| 320 tests passed | VERIFIED locally | `npm run qa:100`: 286 Node cases and 34 Chromium cases, 320 passed, 0 failed, 0 skipped |
| Production build passed | VERIFIED locally | `npm run build` completed and wrote `dist/` |
| Dependency audit clean | VERIFIED locally | `npm audit --audit-level=high`: 0 vulnerabilities |
| 100 synthetic analytics events | VERIFIED in isolation | `reports/synthetic-analytics.json`; PGlite test creates a fresh database and records `productionWrites: 0` |
| Both original migrations applied remotely | UNVERIFIED | `npx supabase migration list --remote` failed with `DbConfigConnectTempRoleError` / password authentication failure |
| New migration pending | VERIFIED by dry run | `npx supabase db push --dry-run --remote` listed only `20261109000000_analytics_boundary.sql` |
| Edge Functions deployed | DISPROVED | `npx supabase functions list --project-ref anvswymarultvsbszjte` returned `functions: []`; both URLs returned HTTP 404 |
| Production site available | VERIFIED | `curl -I https://halal-check-sigma.vercel.app/` returned HTTP 200 |
| New branch is deployed | DISPROVED | live `app.js` lacks `escapeHtml` and `analysis_completed`; live `sw.js` uses `halalcheck-v4`, local uses `halalcheck-v5` |

## Component status

| Component | Status | Evidence / limitation |
|---|---|---|
| Frontend local runtime | PASS | 34 desktop/mobile browser tests passed; no browser test page errors |
| Frontend production runtime | UNVERIFIED / OUTDATED | Production loads, but serves an older build |
| Barcode scanner | UNVERIFIED for hardware; PASS for simulations | Camera denial, unavailable camera, late permission cleanup, and mocked detection passed; no physical Android test |
| Manual lookup | PASS locally | Barcode validation, API success/failure, malformed data, timeout/retry, identity mismatch, and duplicate request tests passed |
| Product lookup | PASS locally | Open Food Facts lookup is bounded, validates returned identity, caches only verified matches, and avoids fabricated products |
| Halal analysis | PASS locally with human-review limitation | Deterministic evidence/uncertainty tests passed; religious content and translations still need human review |
| Ingredient database | PASS locally | Alias, translated evidence, uncertainty, compound, and prohibited-priority tests passed |
| Multilingual support | PARTIAL | RTL behavior and persistence pass; `reports/i18n-coverage.json` records many English fallbacks |
| PWA | PASS locally / UNVERIFIED on device | Offline shell, service worker update behavior, install simulation, and icons pass; Android installation is untested |
| Applied Supabase schema | UNVERIFIED remotely | Remote history command was blocked by database authentication |
| New Supabase migration | PASS in isolation; BLOCKED for production | PGlite executes repository migrations; boundary migration is pending remotely |
| Analytics Edge Function | FAIL in production | URL returns 404; local handler tests pass |
| Admin Edge Function | FAIL in production | URL returns 404; local mocked authorization tests pass |
| Admin authentication | PASS in code / UNVERIFIED live | JWT validation and database authorization are implemented; owner login and membership were not tested live |
| Analytics privacy | PASS in isolation | Consent, empty metadata, origin, body-size, event, and rate-limit checks pass |
| Production analytics | BLOCKED | No deployed ingestion function and pending service-role-only boundary migration |
| Security | PASS locally / BLOCKED operationally | No frontend service-role key found; production boundary is not deployed |
| Automated tests | PASS | 320/320 independently reproduced |

## Tests executed

```text
npm test
PASS

npm run build
Static production assets validated and copied to dist/

npm run qa:100
Node: 286 passed, 0 failed, 0 skipped
Chromium: 34 passed, 0 failed, 0 skipped
Total: 320 passed, 0 failed, 0 skipped

npm audit --audit-level=high
found 0 vulnerabilities

npx supabase db push --dry-run --remote
Would push:
  20261109000000_analytics_boundary.sql
```

The browser suite uses mocked external Open Food Facts, analytics, Supabase client, camera, and install-prompt behavior. It does not prove hosted Supabase Auth, hosted Edge gateway behavior, physical camera hardware, or Android installation.

## Halal analysis audit

The analyzer distinguishes prohibited, source-dependent/uncertain, permissible, and insufficient evidence. Regression coverage includes pork, pork gelatin, unknown gelatin, E471 qualifiers, animal fat, unknown compounds, missing ingredients, flavouring, dairy, pectin, translated evidence, and cross-product isolation. Product certification remains separate from ingredient assessment.

No local false-positive or cross-product contamination bug was found during this audit. Translation completeness and religious-language quality remain human-review items rather than automated guarantees.

## Barcode and camera audit

Automated coverage verifies:

- Invalid barcode rejection.
- API retry and timeout behavior.
- Duplicate request sharing.
- Unknown products without fabricated identity.
- Returned barcode mismatch rejection.
- Camera denial and unavailable-camera fallback.
- Late camera permission cleanup.
- Mocked camera barcode detection.

Real Android Chrome camera permission, autofocus, lighting, decoder performance, camera switching, torch behavior, and PWA standalone installation remain **UNVERIFIED**.

## Supabase and security audit

The local security boundary is structurally sound:

- Sensitive tables have RLS enabled and direct client grants revoked.
- Admin reporting calls `admin_is_authorized()` inside the database function.
- Admin access uses a validated Supabase Auth access token.
- Analytics ingestion uses the service-role RPC path in the new Edge Function implementation.
- Analytics payloads reject arbitrary metadata, referrers, country values, invalid origins, oversized bodies, and unsupported events.
- Frontend assets contain no service-role key, secret key, private key, or password.
- Service worker caching excludes `/admin`, `/api/`, and cross-origin requests.
- Vercel configuration includes CSP, `frame-ancestors 'none'`, `nosniff`, referrer, camera, and cache headers.

### Production blocker

The applied migration history still includes the older anonymous ingestion grant until `20261109000000_analytics_boundary.sql` is applied. The new migration revokes anonymous/authenticated execution and grants ingestion only to `service_role`. Until it is applied, direct anonymous RPC ingestion may remain possible even though the Edge Function code is stricter.

The new migration must not be applied until the owner reviews it and the authenticated CLI/database connection is fixed.

## Analytics verification

The isolated database test:

- Creates fresh PGlite PostgreSQL state.
- Executes repository migrations.
- Sends 100 synthetic events through the dependency-injected real handler.
- Verifies five aggregate counts of 20 each.
- Exercises rate limiting, malformed events, sensitive metadata, wrong origins, oversized bodies, anonymous reads, non-admin reporting, inactive-admin reporting, unauthorized membership writes, and retention.
- Records `productionWrites: 0`.

This does not validate hosted Supabase Auth, hosted gateway routing, deployed function environment secrets, or cron scheduling.

## Translation coverage

`reports/i18n-coverage.json` reports 76 tracked keys. English is complete. Italian, Arabic, Urdu, Hindi, Bengali, French, German, Spanish, Turkish, Malay, and Indonesian have varying English fallbacks. RTL shell stability and Urdu persistence pass, but the application is not fully translated and must not be marketed as fully localized without native-speaker review.

## PWA and production frontend

Local PWA tests pass with the v5 cache, offline fallback, PNG icons, install prompt simulation, and update cleanup. Physical Android installation remains unverified.

Production evidence:

- Main page: HTTP 200.
- `admin-stats`: HTTP 404 / `NOT_FOUND`.
- `analytics-event`: HTTP 404 / `NOT_FOUND`.
- Live `app.js` length and markers differ from the current branch.
- Live service worker uses `halalcheck-v4`; current source uses `halalcheck-v5`.
- Live configuration does not expose the current local analytics/admin configuration markers.

The deployed Vercel project is therefore older than the audited local commit.

## Bugs found and fixes

No new local application bug requiring a code fix was confirmed during this independent run. Existing source and tests already cover the reported fixes. Production function 404s and stale deployment are release/deployment blockers, not issues that can be repaired locally without deployment approval.

No application source files were changed during this audit. Generated report artifacts modified by the test runner were restored; this audit document is the only intended deliverable change.

## Required release actions

1. Restore/fix authenticated Supabase CLI database access and run `npx supabase migration list --remote`.
2. Review and explicitly approve `20261109000000_analytics_boundary.sql`.
3. Deploy `analytics-event` and `admin-stats` with the required origin environment variables.
4. Apply the pending migration only after function deployment and owner approval.
5. Verify anonymous ingestion RPC denial after the migration.
6. Configure and verify the intended active owner UUID in `public.admin_users`.
7. Test real owner login, non-admin rejection, inactive-admin rejection, and expired-token rejection against hosted Supabase.
8. Deploy the audited frontend through the approved Vercel process.
9. Re-run production probes and browser checks against the new deployment.
10. Perform physical Android Chrome camera and standalone PWA tests.
11. Review translation fallbacks with native speakers.

## Final decision

# NO-GO

The local codebase is testable and the independent 320-test claim is verified. Production release is blocked by undeployed 404 Edge Functions, a pending analytics security-boundary migration, unavailable remote migration-history verification, an older live frontend, unverified owner authentication, and unverified physical Android behavior.



