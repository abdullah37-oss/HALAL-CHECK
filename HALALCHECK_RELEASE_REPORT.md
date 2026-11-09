# HalalCheck release report

Date: 9 November 2026 (Europe/Rome). Base commit: `f339b3a`.
Decision: **NO-GO for production completion. Local release candidate is validated and prepared; explicit production approval and account setup remain required.**

## Verified production state

Read both `HALALCHECK_FINAL_REPORT.md` and `HALALCHECK_INDEPENDENT_AUDIT.md`. The independent audit's earlier database login failure did not recur: authenticated read-only migration history and direct database inspection succeeded in this run.

| Item | Actual evidence | Release consequence |
|---|---|---|
| Project identity | `Halal-check production`, `anvswymarultvsbszjte` | Confirmed target |
| Applied migrations | `20261031235000`, `20261104000000` | Confirmed by history and direct read-only SQL |
| Pending migration | Only `20261109000000_analytics_boundary.sql` | Validated, not applied |
| RLS | Enabled on both `analytics_events` and `admin_users` | Verified remotely |
| Current ingestion grants | anon=true, authenticated=true, service_role=true | Confirmed security blocker until boundary migration |
| Anonymous admin reporting | execute=false | Existing reporting boundary rejects anonymous execution |
| Deployed Edge Functions | Empty inventory; GET and OPTIONS both return 404 for both URLs | Functions must be deployed after approval |
| Function environment | Built-in Supabase secret names present; both required `HALALCHECK_*_ORIGIN` names absent | Exact production origins must be configured |
| Owner enrollment | 0 Auth users; 0 active admin accounts | Cannot verify owner login; intended identity and account setup required |
| Retention | pg_cron absent, but available to install | No scheduled purge established; prepared separate approved-only setup |
| Frontend | HTTP 200; deployed app/manifest differ; worker is v4; `/config.js` returns 404 | Current tested assets must be released |
| Public runtime key | Public Auth settings endpoint returned HTTP 200 with configured publishable key | Key/project combination accepted; no user login was attempted |
| Public signup | Auth settings report signup is enabled | Remote setting recorded; no public admin registration UI exists; admin grant remains separate |
| Vercel access | CLI 65.12.1 reports logged out; no `.vercel/project.json` | Secure login and existing project/team verification required |

Sanitized evidence: `reports/release-supabase-preflight.json`, `reports/release-live-baseline.json`. Secret **names only** are retained, never values or digests. No production data changes, valid analytics requests, Auth account changes, function deployments, Vercel deployments or Git pushes occurred.

## Migration validation and approval scope

The pending migration is unchanged from the audited candidate. SHA-256:

`8a5bbbef165a40b899bcde7b35df5ab852579f58b8309fe87f56dbff4e4e75d7`

Reviewed its signatures/types, SECURITY DEFINER search paths, execute grants, rate-limit serialization, aggregation authorization, dependencies and conditional cron scheduling. Every repository migration executed successfully in isolated PostgreSQL (PGlite). A remote dry run independently lists only this migration. No dry run is represented as SQL execution.

`HALALCHECK_DEPLOYMENT_PLAN.md` contains the exact target, commands, order, expected effects and post-deployment checks. Production approval must explicitly cover:

1. Apply the reviewed analytics-boundary migration, closing public RPC ingestion.
2. Set both allowed-origin settings to `https://halal-check-sigma.vercel.app` and deploy `analytics-event` and `admin-stats`.
3. If approved, enable pg_cron and schedule the existing 30-day retention purge for 03:17 UTC daily using `supabase/maintenance/enable-retention.sql`. Setup does not immediately purge records, but the scheduled job deletes expired records later.
4. Separately identify/create/enroll the owner securely. There are no existing Auth users, so an arbitrary UUID cannot repair login. Do not send an invitation or grant membership before explicit approval of the identity/account change.
5. After secure Vercel login and confirmation of the existing project/team, deploy the tested frontend only with production deployment approval.

Applying the migration first is deliberate: both functions are absent, and closing the existing public RPC exposure should precede enabling ingestion. Do not restore anonymous grants as a rollback. Neither applied migration was rewritten. No reset, drop, force-push or new replacement application is planned.

## Local changes in this release preparation

- Added 20 tests against the **actual** `admin-stats` Edge handler, injecting only backend dependencies. They check configured/foreign CORS origins, preflight, missing/malformed/expired/invalid tokens, Auth validation before RPC access, non-admin rejection, valid authorized reporting, date validation, unsupported methods and safe backend failures.
- Added `Cache-Control: no-store` to the shared admin response headers, including authorization errors.
- Pinned Supabase browser/Edge imports to the Deno-checked `2.119.0` SDK and retained a Deno lockfile.
- Declared Node `24.x` for Vercel compatibility and executed the build and full QA using Node **24.22.2**.
- QA now builds and tests the deployment `dist/` artifact, with the configured Vercel security headers enforced by the local test server. The build cleans only the verified generated output directory before copying the existing allowlist.
- Added deployed-artifact header checks and real service-worker v4 cleanup/admin-cache-exclusion tests on desktop and mobile. These validate the local worker rather than merely inspecting source strings.
- Fixed QA termination handling so a browser process terminated without an exit code cannot be reported as a pass. Stale browser reports are removed before each browser run.
- Prepared sanitized production inventory, live baseline, artifact hashing and post-deployment verification scripts. None submits a valid synthetic event to production.
- Prepared retention SQL separately from migration history so its extension/scheduled-deletion effect is explicit at approval time.

Files: `admin/admin.js`, `supabase/functions/admin-stats/index.ts`, `supabase/functions/analytics-event/index.ts`, `package.json`, `package-lock.json`, `deno.lock`, `scripts/build.cjs`, `scripts/qa.cjs`, `scripts/serve.cjs`, `scripts/release-*`, `tests/qa/edge*`, `tests/browser/app.spec.cjs`, `supabase/maintenance/enable-retention.sql`, `README.md`, this report, deployment plan and generated evidence. Existing audit document and commits are preserved.

## Actual test evidence

Latest full release QA: **344 executions, 344 passed, 0 failed, 0 skipped**:

- 306 Node unit/integration executions.
- 38 desktop/mobile Chromium executions against built static assets and Vercel CSP/cache headers.
- `npm run qa:100` is the supported repeatable entry point. This run used `npx --yes --package=node@24 node scripts/qa.cjs` to verify the actual Vercel-compatible runtime.
- Production build passed within that full QA run.
- `npx deno check --frozen supabase/functions/analytics-event/index.ts supabase/functions/admin-stats/index.ts`: exit 0. This checks actual TypeScript and pinned remote imports, not just stripped syntax.
- Current `npm audit --audit-level=high --json`: exit 0, zero reported vulnerabilities; saved in `reports/release-dependency-audit.json`.
- The isolated analytics test records 100 synthetic events, verifies five groups of 20, and checks another 60 repeated events plus rejection at the rate limit, anonymous grants, non-admin/inactive-admin restrictions, aggregates and retention. `productionWrites: 0`.

Evidence: `reports/qa-summary.json`, `reports/unit.tap`, `reports/browser.json`, `reports/synthetic-analytics.json`, `reports/release-deno-check.txt`, `reports/release-artifact-manifest.json`. Node and browser tests do not prove hosted Auth login, Edge gateway behavior, actual cron execution or physical Android operation. Browser SDK/backend responses are mocked; SQL and service-worker behavior are exercised locally.

## Vercel/frontend readiness

**Locally ready for deployment review**, with account/project identity still unverified. Node 24, build command, `dist/` allowlist, public runtime configuration, static routing/assets, PNG manifest icons, CSP and no-store worker/admin headers are validated locally. Service worker v5 removes v4 caches, uses network-first same-origin loading and does not cache admin or external responses. No service-role/secret-shaped credential was found in the built asset scan.

No secret frontend environment variable is required: runtime files contain only the project URL, publishable key and public endpoints. Do not deploy unreviewed project settings or create a temporary replacement Vercel project. The exact current project connection, build setting overrides, permissions and domain ownership still require authenticated inspection.

## Independent post-deployment verification (not yet performed)

After approval and execution:

- Confirm remote migration history, updated grants, function versions and configured origins.
- Run `node scripts/release-verify.cjs` to compare live asset bytes to `dist/` and check HTTP/CORS/auth-denial/CSP/cache behavior. It never sends a valid analytics event.
- Verify the enrolled owner signs in through the actual live dashboard, reporting works and logout removes access. Verify invalid/expired token denial against hosted Auth/gateway; do not infer it solely from mocks.
- Observe a **genuine owner/user action with consent** and independently compare ingestion/reporting. No fake analytics will be injected. Until such an action occurs, real analytics pipeline verification remains UNVERIFIED.
- Verify cron schedule ownership/active state and the first actual run outcome. Scheduling is not proof of successful recurring deletion.
- Verify an existing browser updates its old worker/cache and perform physical Android camera/install tests when a device is available.

## Remaining gates and decision

**NO-GO**: production still has the public ingestion grant, no deployed functions, absent origins, no owner account, no retention scheduler and an outdated frontend. Migration/functions/origin/retention changes are concretely prepared and await explicit approval. Owner email/identity and secure Vercel login are still required. No deployment or production success is claimed.

Translation fallbacks/native-speaker review and physical Android testing remain explicitly unverified product-readiness items. They are not silently treated as evidence that the hosted backend works. The release decision can change to GO only after approved changes and the required independent live checks pass; update this report with actual outcomes rather than replacing pending statuses with assumptions.

## Superseding approved deployment update

See `HALALCHECK_RELEASE_STATUS.md` for the latest live outcome. Since this report's initial preparation, the approved boundary migration, function/origin deployment, retention scheduling and corrected Vercel frontend release have completed. Live read-only checks pass and the production configuration error is gone. The overall decision remains NO-GO for operational completion until owner account setup/enrollment and actual authenticated reporting/genuine consented ingestion are verified. A newly confirmed Auth redirect misconfiguration requires its own two-field approval before the already approved invitation can be sent. GitHub publication is awaiting explicit metadata-disclosure approval after automatic review blocked the first push.

## Privacy-reviewed publication update

The explicitly approved Auth URL correction and one-user invitation are complete. The separately approved sole-owner enrollment is verified with exactly one active administrator and RLS enabled. Owner identifiers and setup records remain local/private. Actual owner login/reporting is still pending independent observation.

Four verified unpublished commits were sanitized for publication without rewriting published history. Generated report machine paths and private commit contact metadata were removed; a local-only backup preserves the originals. Public project references/keys and application behavior are unchanged. Latest full QA passes 397/397; the feature-branch push is limited to the existing HalalCheck branch. Vercel production remains `main` and no new production release is authorized here. `HALALCHECK_RELEASE_STATUS.md` is the current concise source of release status.
