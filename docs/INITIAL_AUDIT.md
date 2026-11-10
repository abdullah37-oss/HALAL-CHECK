# HalalCheck 2.0 baseline audit

Baseline: commit d5265ec31f40bb4c26060898a29f99e438755d22, production deployment dpl_E7N6ZF7pMWTgF27VUQDT13XmAeAP. Dedicated branch: halalcheck-2.0. Production admin assets were checked read-only and matched this baseline with CSP/no-store headers. No production mutations are authorized for 2.0.

## Confirmed working
Baseline QA: 336 unit/integration tests and 88 desktop/mobile browser tests passed, no failures or skips. Ingredient prohibited-source priority, guarded product identity, consent gating, isolated SQL authorization, admin session rejection and the repaired implicit recovery flow have automated coverage. Production HTML and JavaScript match; actual owner password/login and physical scanning remain unverified.

## Confirmed defects
The live scanner exclusively uses native BarcodeDetector and has no decoder on browsers missing it. The result UI calls synchronous getByBarcode rather than the existing asynchronous remote lookup, so unknown local barcodes never reach the configured product service. The language-change handler calls forEach on a single querySelector result. Translation dictionaries silently fill missing keys with English. Arabic normalization and OCR confidence need explicit handling. There are no barcode image or OCR input workflows. Admin charts and strict TypeScript build are absent.

## Suspected defects and risks
Camera video readiness, decoder format compatibility and physical focus need real-frame tests and device review. Compound/multilingual ingredient boundaries need regression cases. Missing product data must remain uncertain. Do not infer scan failure rate from lookup failures: existing events do not identify camera decode failures. OCR must require text confirmation and must not send images externally. Large OCR models must load only on demand. Existing permissions/RLS and owner membership must remain untouched.

## Technical debt and file audit
Application logic is split between root app.js/analytics.js and global scripts under src; scripts depend on load order. Root release documents are historical and contain superseded baseline statements. tests/*.test.js are legacy in-browser harnesses while tests/qa and tests/browser are the executable suites. A root file named halal check is not referenced by the build. These are excluded from the allowlisted deployment; remove only after confirming provenance, otherwise archive/document. Generated reports contain timing churn and belong in reports. Runtime secrets and machine files remain ignored.

## Implementation sequence
1. Local scanner fallback, real decoding fixtures, lifecycle/lookup repairs and local image/OCR workflows.
2. Conservative ingredient regression corpus and complete centralized interface translations.
3. Brand-preserving app layout, calligraphy, sidebar language control and simple privacy choices.
4. Private analytical panels using existing authorized aggregates only.
5. Strict TypeScript source organization, bundled browser output and local worker/model assets.
6. Full regression/type/lint/security/PWA checks, GitHub push and preview in the existing project.
7. Report limitations and request separate production approval.
