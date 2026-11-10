# Password recovery fix: awaiting production approval

Both admin pages explicitly use Supabase Auth's supported implicit flow. The
reset page lets the pinned SDK consume the recovery fragment once; it no longer
attempts a PKCE code exchange. It requires a recovery callback, successful SDK
initialization, an unexpired session and server-side `getUser()` verification
before displaying the form. A stored login alone cannot unlock password setup.
Passwords are saved only through `auth.updateUser({ password })`. A successful
update clears the form and signs out locally before returning to admin sign-in.
Invalid, expired and consumed-link error redirects fail closed and have their
URL parameters removed. Reloading the consumed callback requires a fresh link.

Validation: `npm run qa:100` passed 336 unit/integration tests and 88 browser
tests across desktop and mobile. `npm test` and `npm run build` also passed.
The recovery tests use the real pinned SDK with intercepted Auth requests and
synthetic credentials. They reproduce the original
`AuthPKCEGrantCodeExchangeError: Not a valid PKCE flow url.` and verify the fix,
authenticated password update, invalid/expired links, rejected refresh, stored
session fallback, URL cleanup, server verification and single recovery request.
No real email, password update, admin membership or database change occurs.

The existing Vercel project is `halal-check`, project ID
`prj_XLLFJCgOujfLWpMyMGez8EdCOgJq`. Its production alias is
`https://halal-check-sigma.vercel.app`. The checked-in Vercel configuration builds
with `npm run build`, serves `dist/`, and preserves CSP and no-store admin
headers. Package engines select Node 24.x. No project settings need changing.

After explicit production deployment approval, deploy the reviewed feature
branch from this linked workspace:

```powershell
npx vercel deploy --prod --yes --scope abdullah-b0a5
node scripts/verify-recovery-deployment.cjs
```

The verification script only fetches the six admin HTML/JavaScript assets and
compares them to the tested build, including cache and security headers. It
does not call Auth or send emails. Preserve the current Supabase project,
account, membership, grants and redirect allowlist.

After deployment verification, inspect email-send logs read-only to determine
whether the built-in two-emails-per-hour quota has cleared. Do not test quota
availability by sending email. Request separate approval for exactly one new
recovery email. The owner must enter and submit the new password privately,
then sign in privately; observe the authorized dashboard without copying
credentials or session tokens. Hosted recovery and owner login remain pending
until those user-controlled steps complete.
