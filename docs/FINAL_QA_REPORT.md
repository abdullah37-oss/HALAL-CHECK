# HalalCheck 2.0 QA and release status

## Verified automated results

- Strict TypeScript browser and service-worker checks: PASS.
- Biome correctness/security lint: PASS (18 owned TypeScript files).
- Unit/integration: 400 passed, 0 failed, 0 skipped.
- Desktop/mobile Chromium: 146 passed, 0 failed, 0 skipped.
- Total QA: 546 passed, 0 failed, 0 skipped.
- Production build: PASS. Compiled JS and same-origin lazy WASM/OCR assets.
- npm audit: 0 vulnerabilities across all installed dependencies.
- Deno Edge type check: PASS with frozen updated lockfile metadata; no Edge source deployed or modified.
- Accessibility: all12 tested light/dark public and private viewport states pass WCAG2/2.1 A/AA axe rules without rule exclusions. Incomplete checks remain in JSON reports for manual review; this is not accessibility certification.

## Genuine processing versus simulations

The real ZXing WASM reader decodes generated EAN13, EAN8, UPCA and UPCE images and actual pixels from simulated video streams. The real local Tesseract engine recognizes a rendered ingredient label in desktop/mobile Chromium; tests confirm no remote image requests and require editable full-label confirmation before classification. Network-fault tests block service workers only to make request interception deterministic; PWA/offline tests separately exercise the real worker. Camera permission, delayed media delivery and native decoder lifecycle use explicitly labeled test doubles. They do not establish physical-device scanning reliability.

Admin authorization, real pinned Auth SDK behavior, recovery session validation, private chart clearing and aggregate validation are tested with intercepted synthetic responses. No real password or email is used. All chart fixtures in screenshots are synthetic and never substitute for production metrics. Hosted owner login and actual recovery email delivery remain unverified until performed privately by the owner.

## Security and privacy

Read-only production inventory confirms1active administrator; RLS enabled on analytics_events and admin_users; anonymous reporting and anonymous/authenticated direct ingestion denied; service-role ingestion allowed. This release changes no Supabase schema, grants, membership, Auth or sender configuration. Images stay local, upload MIME/signature/dimension/size limits are enforced, inputs are escaped, and optional analytics remains consent-gated with empty metadata. Existing CSP is preserved with wasm-unsafe-eval only for WebAssembly and same-origin workers; general JavaScript eval is not enabled. Admin responses remain no-store and are excluded from service-worker caches.

## Performance

See reports/performance-build.json for measured artifact sizes. Initial HTML-referenced JS/CSS is about520KB uncompressed and90KB gzip-equivalent; these are build measurements, not measured mobile transfer latency. Barcode WASM is about947KB and is lazy-loaded. OCR language packs are approximately1.0-3.0MB each plus the selected local worker/core, loaded only on request. OCR runs in a worker and closes bitmaps/terminates workers on completion or cancellation. Physical mobile memory, camera startup/focus, thermal behavior and slow-network latency are not measured.

## Release gate

Ready for protected preview review after successful hash/header checks. Production remains unchanged. Production status: NO-GO until owner review/approval, native-speaker review of machine-assisted translations and physical Android/manual acceptance checks are completed or explicitly accepted as limitations. No production deployment, authentication email or account change is authorized by this preview release.
