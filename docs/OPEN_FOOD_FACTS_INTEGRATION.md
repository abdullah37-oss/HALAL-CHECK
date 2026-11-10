# Open Food Facts integration review

Scope: feature preview only, based on verified production commit `5108d9e89d826a6a77d7749c0365d345d5c5dd1a`. No Supabase, account, permission, CORS, production-domain, or authentication changes are part of this feature.

## Audit and real records

The previous browser client read `/api/v2/product/{barcode}.json`, requesting generic `ingredients_text` but no localized ingredient fields, images, structured ingredients or quality indicators. Its two attempts had no backoff. The local catalogue could override current remote data indefinitely; offline and error handling did not distinguish enough states. The analyzer itself already conservatively handled unknown and source-dependent ingredients; that policy remains unchanged.

The public record for **8024985013758**, recorded on 2026-11-10, returned HTTP 200 and the actual name **Mela, fragola e mirtillo frullati biologici**, brand **Bio+, Natura Nuova**, and an image. Generic text, all twelve requested localized ingredient fields, structured ingredients and ingredient tags were absent. This is an upstream data gap, not an Auth/CORS failure. We have not repaired or contributed that missing information. The result retains its real identity, shows NEEDS CHECKING, and offers OCR/manual entry.

A second recorded product, **3017620422003**, contains English `sugar, palm oil` while its French label is substantially longer. The short English label is treated as potentially incomplete. Neither fixture proves that the package currently sold matches community data. Raw public responses and timestamped endpoint provenance are in `tests/fixtures/open-food-facts/`; synthetic scenarios are explicitly labelled test data.

## API, mapping and policy

The typed client uses the currently documented **v3.6** read endpoint:

`https://world.openfoodfacts.org/api/v3.6/product/{exact-barcode}.json?fields=...`

Browsers call only `GET /api/products/{barcode}?lang={supported-language}` in the existing Vercel project. The server sets `HalalCheck/2.0 (https://github.com/abdullah37-oss/HALAL-CHECK)` as its User-Agent. No read API key is needed. The decoder still expands UPC-E; the client preserves string input/zeros and recognizes OFF's equivalent UPC/EAN zero padding. Other returned identities fail closed. String/format/length and GTIN check-digit validation are shared by manual entry, camera/image handling and the API. All-zero codes are rejected. A valid checksum still does not prove allocation or physical product identity.

The adapter accepts legacy v2-shaped product bodies for compatibility/fixtures; it does not make a second v2 request. It validates responses and bounds bodies to 1 MiB. Selection order is UI-language label, original-language label, generic label, another available supported-language label, then structured text. Names and labels are preserved, never machine-translated or merged. Tags alone are not a label. Structured-only and tags-only evidence are partial. Missing text stays missing. Ingredient-related quality warnings, truncation and a substantially shorter localized list reduce completeness. Conflicting generic/original-language text is uncertain. The cross-language length/clauses check is a conservative heuristic, not semantic translation comparison.

“Complete” means an apparently complete available label without detected problems, **not independently verified packaging**. Community records can be wrong. Text is analyzed through the existing universal ingredient policy; no Nutri-Score, vegan/vegetarian tag or `halal` marketing tag grants certification. Partial, stale and unknown evidence cannot establish HALAL merely through the absence of prohibited ingredients. Explicit prohibited evidence can still establish HARAM. OCR requires user review and full-label confirmation; low confidence remains uncertain.

## Reliability, limits and security

- Browser: one request per lookup, coalesced by canonical barcode and language; 15-second deadline.
- Server: at most two upstream attempts, each with a 6-second deadline, with 700–899 ms backoff. No immediate retry for 429 or a supplied Retry-After; seconds/HTTP dates are honored with a bounded cooldown. Failures are not cached as successful products.
- Browser and server each retain at most 100 products, with a one-hour freshness TTL. Server not-found caching lasts 60 seconds. Offline browser fallback is explicitly stale and limited to seven-day saved records or the separately maintained legacy catalogue. Reanalysis does not renew freshness. Old incompatible cache entries are not promoted.
- Fixed HTTPS upstream, fixed path/fields, supported-language allowlist, GET-only handler, denied cross-origin browser use, no arbitrary destination, redirect following, cookie, Authorization or user-supplied header forwarding. Images require HTTPS on `images.openfoodfacts.org` with an allowed product-image path; no query/credential URLs. Rendered source text is escaped.
- Per warm function instance: maximum 10 upstream calls/minute, 60 incoming requests/minute, eight pending distinct lookups, with deduplication and cooldown across barcodes. These are **not a durable global quota**: serverless scale-out, cold starts and shared outbound IPs can still meet OFF's limit. CDN caching reduces repeated traffic. Before a broad production launch, review expected traffic and existing Vercel firewall/global throttling; a shared limiter/queue may be necessary. No provider security settings were changed to conceal this limitation.
- No API keys or new secrets. No new packages. New server code/test bundles are outside public `dist/`. The PWA excludes `/api/` and `/admin/` from caches. v6-to-v7 upgrade tests preserve settings, consent, history, and synthetic Auth storage, including interrupted installation.

## Licensing and privacy

Product attribution appears in About and results, linking the original product/source and ODbL. Individual contents are DbCL; displayed product photos link CC BY-SA 3.0 and their source product page. No image modifications or automatic OFF contributions are performed. These obligations apply to recorded fixtures and bounded OFF caches as well. Reuse or redistribution of a derivative database requires ODbL attribution/share-alike and making the applicable derivative database available under those terms; obtain a licensing review before bulk copying, mixing databases, or exporting a public derivative. Application policy and private aggregate analytics are maintained separately. This technical review is not a legal opinion.

Camera and OCR files stay on-device. Product images are fetched from OFF's image host with no referrer; OFF sees image network requests. Barcode requests necessarily pass through Vercel and OFF; infrastructure request logs may contain endpoint paths. The application adds no product logging. Raw barcodes, ingredient lists, names and images are not sent to analytics. Optional analytics remain consent-controlled and allowlisted. Local OFF cache data is distinct from private administrator analytics; no public export/contribution feature was added.

## Verification and remaining acceptance

Run `npm run qa:100`, `npm run typecheck`, `npm run lint`, `npm run build`, then `node scripts/release-manifest.cjs`. Exact final totals are in `reports/qa-summary.json`. Coverage includes all 22 requested scenarios, real fixture mapping, transport/runtime validation, bounded retries/cooldowns/cache, real local barcode decoding and synthetic-image OCR, simulated camera streams, mobile layout, WCAG result checks, all twelve language dictionaries/RTL, privacy, Auth/recovery/dashboard regressions and PWA updates.

Browser tests use deterministic product fixtures and synthetic Auth sessions. They do not claim actual owner authentication, physical Android scanning, photographed-label OCR, native-speaker translation approval, real installed-PWA update success, or low-end-device performance. Preview analytics remain limited by existing production-only CORS; do not change CORS to make acceptance look successful. Owner verifies private login/real statistics on the authorized production origin separately.

The first preview exposed a real hosting defect that local esbuild bundles did not reproduce: ES-module output was loaded as CommonJS by the function runtime (`Cannot use import statement outside a module`). `api/tsconfig.json` gives the server entry its own Node/CommonJS compilation boundary while leaving browser compilation unchanged. A regression now compiles and loads the actual entry inside a CommonJS package. `Node16` here specifies TypeScript module-resolution rules, not a downgrade of the deployed Node 24 runtime. A replacement preview must pass live endpoint checks before acceptance.

Hosted dynamic routes also bind `barcode` into the request query. The proxy accepts one validated binding, requiring an exact match when the public numeric path is present. For the fixed internal function-template path it validates that single bound code. It rejects duplicate/conflicting bindings and every arbitrary URL parameter. Regressions cover public and encoded/unencoded function-template request forms. This platform adapter preserves the same barcode identity checks, upstream host restriction and request budgets.

Production recommendation: **NO-GO until owner accepts preview results, remaining device/translation limitations and rate-limit capacity, and explicitly approves an exact release commit**. Preview deployment and verification do not authorize production promotion. Keep the existing production release available for rollback; do not run unrelated Supabase deployment instructions from older documents.

Official references reviewed:

- [OFF API versions, identification and rate limits](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/)
- [v3 reference](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/ref-v3/)
- [Barcode normalization](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/ref-barcode-normalization/)
- [Licensing and reuse](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/)
- [Local cache licensing](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/creating-a-local-cache-of-open-food-facts-data/)
- [Vercel Node Web Standard functions](https://vercel.com/docs/functions/runtimes/node-js)
