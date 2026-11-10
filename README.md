# HalalCheck 2.0

A framework-free TypeScript website and installable PWA for evidence-based food ingredient checks. It preserves the existing HalalCheck brand, Supabase backend and Vercel routes. Results are HALAL, HARAM or NEEDS CHECKING under the documented default policy; ingredient assessment is not certification or a religious ruling.

## Development

Use Node.js24.x and the committed npm lockfile.

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm run lint
npm run qa:100
npm run build
npm run serve
```

The server serves only dist/ on http://127.0.0.1:4173. npm test runs unit/integration tests after building; npm run qa:100 builds, runs all tests/qa suites, then desktop/mobile Chromium against the built artifact with Vercel headers. Scanner tests decode genuine generated EAN13/EAN8/UPCA/UPCE images and video-frame input through WASM; OCR tests execute the local engine. Controlled media/Auth tests are separately labeled and never mutate production. npm audit checks dependencies. Deno Edge validation remains npx deno check --frozen supabase/functions/analytics-event/index.ts supabase/functions/admin-stats/index.ts.

## Features and boundaries

- Live retail barcode decoding with native API and local WASM fallback, switching/torch where hardware allows, lifecycle cleanup and manual fallback.
- Local JPEG/PNG/WebP barcode-image decoding.
- Local ingredient OCR (English/Italian/Arabic/Urdu models), editable review and explicit completeness confirmation. Other interface languages remain supported independently.
- One identity-validated product repository and conservative analyzer for all input methods. Unknown/source-dependent or incomplete ingredients never become confirmed Halal.
- Twelve centralized interface locales with persisted selection and Arabic/Urdu RTL. Translations are machine-assisted and require native-speaker review before production.
- Simple essential-only/optional-analytics choices. Optional events are disabled until consent; no raw barcode, ingredient list or image is included. Withdrawal stops future collection.
- A private navy/cyan analytics dashboard with actual authorized aggregates and explicit empty/unsupported states; events are not unique people.

Images stay on-device. Open Food Facts receives barcodes only when local data is absent; community data requires current packaging verification. See its API and ODbL reuse terms at https://openfoodfacts.github.io/documentation/docs/Product-Opener/v2/products/get-product-by-code/ and https://world.openfoodfacts.org/terms-of-use. Downloadable review reports stay on the device until the user deliberately shares them.

## Architecture and policy

See [Architecture](docs/PROJECT_ARCHITECTURE.md), [TypeScript migration](docs/TYPESCRIPT_MIGRATION.md), [Scanner/OCR](docs/SCANNER_AND_OCR.md), [Ingredient policy](docs/HALAL_ANALYSIS_POLICY.md), [Analytics/privacy](docs/ANALYTICS_AND_PRIVACY.md), [Baseline audit](docs/INITIAL_AUDIT.md) and [Final QA](docs/FINAL_QA_REPORT.md). Historical root HALALCHECK*.md records describe previous releases and may contain superseded baseline observations.

## Deployment and security

Only allowlisted assets and compiled JavaScript enter dist/. Local WASM/OCR workers/models are lazy-loaded; API secrets, .env files, SQL, test fixtures, source maps and reports are excluded. Browser configuration contains public URLs and a publishable key only. No service-role credentials belong in frontend code. Admin reporting retains existing Supabase Auth, protected Edge verification and database authorization. Recovery uses the reviewed implicit flow, verifies a recovery session with Auth, and saves through updateUser. Owner password entry remains private.

Development takes place on halalcheck-2.0. Push without force, publish a preview in the existing Vercel project, then request explicit owner approval before production. Supabase schema, RLS, Auth settings, admin membership and authentication emails require separate explicit approval; no2.0 development task authorizes those changes. Never create a replacement project.

Physical Android camera/focus and real packaging/OCR accuracy need the manual acceptance checklist in Scanner/OCR. Automated contrast tests are not legal or accessibility certification. Auth/email delivery and owner dashboard sign-in are not claimed until performed privately by the owner.
