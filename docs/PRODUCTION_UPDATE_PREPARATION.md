# HalalCheck 2.0 production update preparation

Status: prepared; NOT deployed. Final production approval is required.

## Reviewed candidate

Branch: halalcheck-2.0. Previously reviewed head: d97b4a1946ae6adb74943cc379a28ca19249faae. Runtime source commit: 7feb9f03ded46729e2ca37f9c78b80d0d627ffe4. This preparation adds upgrade tests, verification tooling and evidence only. All 45 production artifact hashes remain identical to the tested/reviewed preview. The exact final release commit is reported with the approval request; deploy only that commit after checking a clean workspace.

The production build includes the premium dashboard markup, CSS, compiled controller, trend/donut charts and the existing protected statistics endpoint integration. It contains no fabricated live metrics.

## Existing authentication and analytics

The owner confirmed current production administrator sign-in and real Supabase statistics in this request. Public Auth/analytics configuration is byte-identical between production and candidate. The Supabase project URL, publishable key, SDK version, session storage convention and statistics endpoint remain unchanged. Production-origin authorization preflight returns 200. The gateway returns 401 without a user session and no statistics, as expected. The preview's 403 origin restriction does not apply when this same code runs on the already allowed production origin. No CORS, RLS, account, membership, authentication or sender setting is changed.

Current owner login and statistics are owner-confirmed. Real authorized data rendered by the new production UI still requires post-deployment verification through the owner's private signed-in browser. Do not request or copy passwords/tokens, impersonate the owner, or use a service-role bypass.

## Existing installed PWA upgrade

Production currently serves halalcheck-v5; the candidate serves halalcheck-v6. Manifest id, scope, start_url, name and short_name are unchanged. Both workers keep admin pages out of caches. Cache cleanup operates on CacheStorage only and does not clear localStorage.

Four genuine browser-upgrade scenarios passed: normal upgrade and interrupted-install/retry on desktop and mobile Chromium. They served a captured copy of the actual production static files, then switched to the candidate on the SAME local origin without unregistering the worker, uninstalling or clearing storage. Language, theme, history, consent and synthetic Auth storage remained intact. The new shell worked offline, and admin HTML stayed outside the cache. An interrupted installation retained the old working offline shell; retry installed v6 successfully.

Users should open the installed PWA online and reload/reopen it if an old screen remains visible. Activation does not replace an already rendered page. They should NOT uninstall or clear personal settings. Offline-only devices cannot download a new release until they reconnect. Physical installed Android behavior is still pending owner observation; mobile Chromium emulation is not proof of phone validation.

## Validation and residual risks

Strict TypeScript and lint pass. Full QA: 401 unit/integration plus 150 desktop/mobile browser tests, 551 passed, 0 failed, 0 skipped. New production-candidate artifact and compatibility reports are under reports/. No application runtime source was changed for this preparation.

Pending risks: physical Android camera/focus/torch and real-label OCR accuracy; native-speaker review of draft translations; low-end phone performance/memory; browser-managed installed-PWA update timing; and live authorized new-dashboard verification after deployment. Language coverage is not linguistic approval, browser fixtures are not physical-device approval, and a deployable build is not proof of product-classification accuracy on every label.

Recommendation: technically ready for an explicitly approved controlled rollout, but NO-GO for an unrestricted release until the pending manual checks are completed or the owner explicitly accepts these residual risks. This preparation is not that approval.

## Approved-only deployment

Existing project: halal-check, prj_XLLFJCgOujfLWpMyMGez8EdCOgJq. Production domain: https://halal-check-sigma.vercel.app. Current immutable rollback reference: dpl_E7N6ZF7pMWTgF27VUQDT13XmAeAP / halal-check-wevqcwfh6-abdullah-b0a5.vercel.app.

After explicit approval of the final SHA: verify HEAD equals that SHA, workspace is clean, project link matches, and artifact hashes still match the reviewed manifest. Then build and deploy through the existing link:

```powershell
npm run build
npx vercel deploy --prod --yes --scope abdullah-b0a5
node scripts/verify-production-release.cjs
```

Do not run the production deployment before approval. No Supabase write command is part of this release. Do not merge branches, change origin settings, send recovery emails or reset accounts as a deployment shortcut.

## Post-deployment acceptance

1. Confirm READY and production alias assignment, then compare all 45 assets and three main routes plus CSP/cache headers using the read-only verification script.
2. Check public scanning/upload/OCR controls, privacy choices, language selection, manifest and v6 worker.
3. In the owner-controlled signed-in browser, verify the new dashboard design, actual protected API response, real counts, date filtering and logout. Inspect session-dependent UI only; never export credentials. If that session is unavailable to the agent, owner confirmation is required and the result remains unverified until supplied.
4. On the existing installed Android PWA, open online, reload/reopen if needed, confirm the new interface and retained language/theme/history/consent, then check offline shell behavior. Do not uninstall or clear storage.
5. If a release check fails, report it immediately, stop further changes and use the recorded immutable deployment as the rollback reference under the owner's release instructions. Do not weaken security or alter data permissions.
