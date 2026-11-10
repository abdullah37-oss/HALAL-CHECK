# Project architecture

HalalCheck remains a framework-free responsive website and PWA. The existing Vercel routes and Supabase project are preserved.

- src/app/main.ts: public application controller, navigation, consent, camera lifecycle and result presentation.
- src/app/service-worker.ts: versioned network-first public shell; admin and foreign requests excluded.
- src/features/scanner: local ZXing WASM adapter and retail-format normalization.
- src/features/image-recognition: bounded image validation and cancellable local OCR.
- src/models: typed Product/Ingredient domain objects.
- src/data and src/utils: central ingredient evidence, documented policy, analyzer and validated product repository.
- src/i18n: centralized dictionaries, persisted language, dynamic text and RTL handling.
- src/services/analytics.ts: consent-gated, allowlisted aggregate event transport.
- src/types: shared browser and API contracts.
- admin: independently authorized TypeScript dashboard and guarded recovery page.
- supabase: existing migrations, maintenance SQL and TypeScript Edge Functions, unchanged.
- tests/qa, tests/browser, tests/fixtures: deterministic policy/database, real browser and generated decoding fixtures.
- scripts: explicit allowlisted build, QA, privacy and release checks.
- docs: current documentation; older HALALCHECK*.md files are historical release evidence, not instructions to change current production.

## Data boundaries
Camera and image pixels remain on the device. A decoded barcode goes to the existing product catalogue or Open Food Facts; verified barcode identity and bounded ingredient data feed the same analyzer. OCR text is displayed for user correction and explicit completeness confirmation before analysis. Unknown/insufficient evidence remains NEEDS CHECKING. Local history and review-report downloads are user-controlled; ingredient lists and barcodes never enter analytics.

Admin requests use Supabase Auth and the existing protected stats Edge Function. Charts render only after authorization and runtime response validation. No browser service-role key, new tracking schema or public reporting endpoint is introduced.

## Build boundary
TypeScript sources are not shipped. esbuild emits JavaScript at the existing URLs in dist/. WASM, OCR workers and language data are copied from pinned lockfile packages into same-origin assets and loaded only when needed. Configuration literals remain public JS and are validated at build time. Use npm run build before local tests/serve.
