# HalalCheck production change plan (awaiting explicit owner approval)

Target database: `Halal-check production`, project `anvswymarultvsbszjte`.
Target website: `https://halal-check-sigma.vercel.app`.
No command in this document has been executed as a production mutation.

## Reviewed migration

Only pending migration: `20261109000000_analytics_boundary.sql`.
SHA-256: `8a5bbbef165a40b899bcde7b35df5ab852579f58b8309fe87f56dbff4e4e75d7`.

It revokes anonymous/authenticated ingestion RPC execution, grants it to `service_role`, replaces validation/rate-limit and reporting functions, and conditionally schedules an existing retention function if pg_cron is installed. It does not reset/drop tables or rewrite historical records. A scheduled retention job later removes records older than the existing 30-day policy.

Remote history and dry run agree: `20261031235000` and `20261104000000` are applied. All three migration files execute in isolated PostgreSQL. Production currently permits anonymous/authenticated direct ingestion; applying this boundary closes that exposure.

## Approved-only sequence

Recheck the release hashes, QA result and linked target immediately before executing. Stop on any unexpected pending migration or target mismatch. Do not use `--prune`, reset commands or force-push.

1. Apply only the reviewed pending migration first. Both Edge Functions are currently absent, so there is no working ingestion endpoint to interrupt. Closing the public RPC boundary first avoids a temporary unauthenticated write path.

```powershell
npx supabase db push --dry-run --remote=anvswymarultvsbszjte
npx supabase db push --remote=anvswymarultvsbszjte --yes
```

2. Configure the exact allowed production origins (public URLs, not new credentials) and deploy the pinned, Deno-checked functions.

```powershell
npx supabase secrets set HALALCHECK_WEB_ORIGIN=https://halal-check-sigma.vercel.app HALALCHECK_ADMIN_ORIGIN=https://halal-check-sigma.vercel.app --remote=anvswymarultvsbszjte --yes
npx supabase functions deploy analytics-event admin-stats --use-api --remote=anvswymarultvsbszjte --yes
```

`analytics-event` has `verify_jwt=false` for consented anonymous events; SQL permits ingestion only through its server service-role client. `admin-stats` has `verify_jwt=true`, independently calls Auth `getUser()` and relies on SQL admin membership. Never disable the handler's user validation or expose the service-role value. No global `--no-verify-jwt` flag is used.

3. Enable and schedule retention as a separately disclosed production change:

```powershell
npx supabase db query --remote=anvswymarultvsbszjte --file supabase/maintenance/enable-retention.sql --yes
```

This enables the available `pg_cron` extension and schedules `halalcheck-analytics-retention` for 03:17 UTC daily. There is no immediate purge in the setup script. The recurring job removes events older than 30 days. Its first actual scheduled run must be verified; the isolated database cannot run the hosted scheduler. Do not revert security grants if any deployment step fails; repair forward.

4. Create the intended owner securely and authorize only its verified Auth UUID. **Blocked: production has zero Auth users and the owner's email/UUID has not been supplied.** Account creation/invitation and owner enrollment are separate production changes requiring explicit approval. Do not invent an identity, create public admin signup, expose passwords or send an unapproved invitation. Once the owner exists, prepare an exact UUID-specific enrollment statement for review.

5. Authenticate Vercel securely and inspect the existing project before changing it. **Blocked: CLI is logged out and no local project link exists.** Use Vercel's device login; do not paste tokens into chat. Match the existing `halal-check-sigma.vercel.app` alias to the correct project/team. Do not create a replacement project or blindly link by an assumed name.

6. After frontend deployment approval and project verification, release the tested static project through the existing Vercel project. Local configuration: Node `24.x`, `npm run build`, output `dist/`, `vercel.json` security/cache headers. Public runtime URLs and publishable key are checked in; the public Auth settings endpoint accepted the key (HTTP 200). No secret environment variable is needed in the browser build. If using CLI, use `vercel --prod` only after the existing project has been confirmed. No Git push or production deployment is authorized merely by this plan.

## Post-deployment independent verification

- Re-run `scripts/release-evidence.ps1`: all three migrations applied, both functions listed, RLS enabled, anonymous/authenticated ingestion grants false, service-role grant true.
- Inspect actual cron job configuration and first run status. Do not describe scheduling as successful execution.
- Run `node scripts/release-verify.cjs`: compare deployed asset bytes to `dist/`, check CORS, anonymous and invalid-token rejection, private reporting RPC denial, CSP and worker cache headers. This script sends no valid analytics event and performs no Auth mutation.
- Sign in as the actual owner through the live dashboard using a secure user-controlled login. Verify loading, dates, truthful aggregates and logout. Do not copy access tokens to logs or chat.
- With the owner's consent, observe one genuine visit/action and compare actual ingestion and dashboard aggregate changes. Do not automate fake production events. If no genuine consented interaction occurs, mark pipeline verification UNVERIFIED.
- Check an older browser profile updates from cache v4 to v5; verify offline shell and exclusion of admin responses. Android camera/installation remain physical-device checks, not simulated guarantees.
- A release remains NO-GO for operational completion until the actual owner can sign in, the real consented pipeline is verified, and the pending production checks pass.
