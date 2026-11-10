# HalalCheck 2.0 preview release

Preview: https://halal-check-72vbb8uc3-abdullah-b0a5.vercel.app

Existing Vercel project: halal-check. Deployment: dpl_Ejrt92M46C751xLDpbC48Q33YrBY, READY, preview environment. Runtime source and full QA commit: 7feb9f03ded46729e2ca37f9c78b80d0d627ffe4 on halalcheck-2.0. Later release-evidence commits contain documentation/reports only and do not change the deployed application.

## Verification

All 45 deployed assets plus the three public/admin/recovery route URLs passed 48 authenticated HTTP smoke checks. JavaScript, WASM, OCR workers/language packs, styles, icons and manifest match the tested build byte-for-byte. HTML matches after removing only Vercel's known preview-toolbar script injection. CSP, referrer policy, nosniff, permissions policy and cache policies passed; admin and service-worker responses remain no-store. See reports/preview-verification.json.

Browser behavior is tested against the identical local build: 401 unit/integration tests plus 146 desktop/mobile browser tests passed, no failures or skips. The deployed preview was checked through authenticated Vercel HTTP access; no live password or real administrator session was used in those smoke checks. Vercel authentication may be required to view this protected preview.

## Deliberately unchanged production boundaries

Production remains at the approved d5265ec baseline. Read-only comparisons confirm the existing pages/scripts are unchanged after normalizing Git line endings. No Supabase schema, grants, administrator account, sender setting or Auth redirect allowlist was changed. No authentication email was sent.

The current admin API's production-only CORS policy returns200 for the production origin and403 for this preview origin. This means live authorized analytics cannot be viewed from the preview without a separately approved backend origin change. The code uses the real protected stats endpoint and never substitutes invented data; dashboard appearance is captured in clearly synthetic test screenshots under reports/. Do not bypass the origin check, modify RLS or spoof a production Origin to work around this boundary. Recovery emails must not be requested from preview; the existing redirect allowlist remains unchanged.

## Owner review

Review the public scanner/image/OCR workflows, navigation, calligraphy and consent on the preview. Use docs/SCANNER_AND_OCR.md for physical Android and real-label checks. Native speakers should review the draft translations, especially policy uncertainty, consent and authentication text. Live owner login/analytics and real email delivery remain unverified until performed privately in an approved environment.

Production readiness: NO-GO pending owner review, physical-device/native-language acceptance and explicit production approval. If live preview analytics is required before approval, a separate narrowly scoped preview-origin change must first be proposed and approved. This release does not authorize that change.
