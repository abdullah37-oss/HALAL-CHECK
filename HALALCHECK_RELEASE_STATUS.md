# HalalCheck release status

Date: 9 November 2026 (Europe/Rome).
Decision: **NO-GO until the actual owner is authenticated and real reporting/pipeline checks pass.**

## Admin login root cause

The production page loaded `/admin/config.js` successfully (HTTP 200), but all three public configuration values were empty. The production `admin/admin.js` was an older deployment. A fresh Chromium session reproduced `Supabase is not configured yet.` with no console errors, failed network requests or Auth request attempts. The form never reached Supabase Auth. Root `/config.js` also returned 404, but the admin page's relative URL correctly resolved to `/admin/config.js`; this was stale content, not a mistaken relative path.

Evidence: `reports/admin-live-assets.json`, `reports/admin-live-browser-before.json`, `reports/admin-live-before.png`.

## Corrected implementation

The local admin/public configuration targets the verified production Supabase project and contains only the public project URL, publishable key and endpoint URLs. Added a runtime validator and build gate that reject missing/blank values, wrong-project endpoints, insecure URLs and non-public keys before an invalid release can be built. Configuration scripts load before the login module. SDK loading/initialization failures now display a visible error and disable login rather than leaving an inert form.

The form submits through the real pinned Supabase SDK. The dashboard remains hidden until an authenticated request to the server-authorized admin-stats endpoint succeeds. Login failures, session expiry/refresh rejection, logout, Auth/network failure, reporting 404 and late responses after logout are handled. Logout clears rendered private data and the SDK's local session. Secure invitation/recovery password setup is supported for an existing Auth session; it never creates a user or grants admin access.

## Approved production changes completed

- Migration `20261109000000_analytics_boundary.sql` applied after hash verification and fresh dry run. Remote history contains all three migrations.
- Anonymous/authenticated ingestion RPC execution revoked; service_role ingestion remains granted. RLS remains enabled for both sensitive tables.
- Required web/admin origins configured to `https://halal-check-sigma.vercel.app`.
- Both Edge Functions deployed and independently listed ACTIVE, version 1. analytics-event uses verify_jwt=false; admin-stats uses verify_jwt=true plus handler Auth validation and database membership checks.
- Both CORS preflights returned 200 with the configured origin. Admin missing/invalid token requests returned 401; anonymous reporting RPC returned 401; foreign-origin analytics preflight returned 403. No valid synthetic analytics events were submitted.
- pg_cron enabled and active job `halalcheck-analytics-retention` verified at `17 3 * * *`, running `select public.purge_old_analytics_events()`. First real scheduled execution remains UNVERIFIED; no immediate manual purge was run.

Evidence: `reports/approved-backend-verification.json`, `reports/release-postdeployment.json`. The latter also records frontend checks; frontend failures before its deployment are expected and must not be presented as backend failures or overall PASS.

## Owner account and authorization

The specified email lookup returned no Auth user in this project. No UUID can be truthfully retrieved or enrolled before an account exists. The owner approved preparing creation and subsequently approved creating one app Auth account and sending one setup invitation **after** the corrected live frontend is verified. That conditional creation has not yet been executed at the time of this entry.

No admin account, password or membership was created/changed. The detailed owner proposal and enrollment placeholder are kept in ignored `.release-private/` files so the owner's email/UUID are not unnecessarily published in this public repository. After creation, retrieve the actual UUID and obtain separate approval of its exact enrollment statement. Sole-active-owner enforcement remains in the prepared transaction and database authorization; no frontend-only bypass or RLS disabling is permitted.

## Frontend and GitHub release

Vercel CLI login is now verified as the expected account. Inspection confirmed the existing production alias belongs to project `halal-check` in verified hosting workspace. The local checkout is linked to that same project; no replacement project was created. Public runtime configuration and build compatibility are validated. Private owner setup files, environment files, reports, tests and local dependencies are excluded from Vercel uploads. Vercel-generated local environment credentials are ignored and never read, printed or committed.

Corrected source is prepared for a GitHub commit and the approved Vercel production release. Deployment and post-release outcome will be recorded below after execution, not assumed from local tests.

## Actual QA evidence

Full suite after authentication changes: **390 executions, 390 passed, 0 failed, 0 skipped** (328 Node cases and 62 desktop/mobile Chromium cases), against built assets on Node 24.22.2 with Vercel security headers. Includes 24 browser executions using the actual pinned Supabase SDK with Auth/reporting HTTP responses intercepted locally, not a replacement SDK. These verify password-grant request submission, incorrect credentials, authorized reporting, non-admin denial, expired access sessions, rejected refresh, logout, missing config, SDK network failure, reporting failure, pending-authorization visibility, stale-response isolation and recovery password update.

Local tests do not establish successful live owner authentication or real dashboard reporting. The overall admin dashboard is **NOT PASS** until those two live requirements are met.

Evidence: `reports/qa-summary.json`, `reports/unit.tap`, `reports/browser.json`, `reports/synthetic-analytics.json`. The isolated 100-event regression remains in the suite and does not write fake traffic to production.

## Pending independent live checks

1. Deploy the corrected frontend to the verified existing project and check configuration/runtime/error removal at the real `/admin/` URL.
2. Execute the approved one-user invitation only after the corrected setup page is live; retrieve the actual UUID.
3. Obtain explicit approval for exact UUID-specific sole-owner enrollment before any membership change.
4. Owner completes the secure setup/login themselves; verify actual Auth success and real authorized aggregate retrieval, failed/expired credentials, logout and unauthorized denial.
5. Observe genuine consented usage and verify its stored/reporting effect; no synthetic production traffic.
6. Verify first cron execution, physical Android camera/PWA behavior and outstanding translation review.

## Deployment and post-release outcome

Pending execution at this report entry. NO-GO remains until the required actual results are recorded.
