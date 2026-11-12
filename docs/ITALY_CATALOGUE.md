# Italian catalogue: research release, not 1,000 verified products

Feature branch: `feature/italy-catalogue-pipeline`. Starting commit:
`e8561e7a86fad465e2707c29a1b7f3a85d2f33a0`. The premium homepage/result,
scanner, OCR, existing administrator and analytics systems are preserved.
No production deployment, Supabase data/settings/Auth/RLS/CORS change, account
operation or branch merge is part of this work.

## Actual evidence and counts

The owner's CSV has 1,000 allocation slots and **zero rows containing product
names, barcodes or ingredients**. Its instructions/status cells are inert data;
they cannot grant verification. `data/italy/research-queue.json` records the input
hash and allocations without publishing a personal filesystem path.

Six bounded OFF retailer search batches discovered 101 source records: 100 Lidl
and one IN's-tagged record. Three unsupported 22-digit codes were excluded.
**98 unique checksum-valid research records were imported**, with 93 containing
both name and brand, 73 containing original ingredient text, and 98 having an
allowed community product-photo URL. Missing names remain missing; the UI uses
the existing translated generic heading. No size/flavour substitutes are made.

**VERIFIED: 0. REVIEW_REQUIRED: 67. INCOMPLETE: 31. REJECTED imported: 0.**
The three invalid barcodes are excluded, not counted as imported products.
**Public HALAL: 0; HARAM: 0; NEEDS CHECKING: 98. Shortfall: 1,000 verified.**
These are not 98 completed products. Packaging/image identity and original label
coverage have not been independently corroborated. The snapshots supplied no
ingredient-photo URLs, so no real packaging OCR was performed or passed.

Conad, Eurospin, MD and Todis discovery requests returned HTTP 503 without
Retry-After. No individual retries were sent. The first script continued other
retailer queries after 503; it now stops immediately on 503/429/Retry-After.
Future research must respect the upstream cooldown and should prefer bulk data.
The official HF Parquet export was 8,039,779,369 bytes at inspection. Its viewer
search failed and exact-retailer filter returned 422. A selective DuckDB bulk
query did not complete within the research window and was interrupted; it
contributed **zero** rows. These access attempts are not evidence of products.
We did not download the global 8 GB export or circumvent access protections.

The [official OFF dataset](https://huggingface.co/datasets/openfoodfacts/product-database)
and [API guidance](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/)
support licensed bulk research. Community content is not an assurance that
currently sold packaging matches it. Current source URLs, timestamps, canonical
body hashes, original response hashes and source revisions are versioned under
`data/italy/sources/`. Counts and per-category details are generated in
`reports/italy-catalogue.json`.

## Research priorities and retailer associations

The requested category targets remain research allocations: dairy drinks 130;
cheese/desserts 90; frozen meals 130; frozen snacks 90; drinks 130; sweets 140;
bakery/biscuits 130; chocolate 80; ice cream 50; noodles/soups/sauces 30.
The CSV's different original allocations are preserved in its separate summary.
Records outside these priority categories are retained as explicitly incomplete
research when useful, never counted to fill a category quota.

Official retailer pages are discovery references only; their text/photos have
not been imported without a reuse licence:

- [Todis private labels](https://www.todis.it/marchi/) and [Bio dairy line](https://www.todis.it/marchi/bio/).
- [Eurospin brands](https://www.eurospin.com/it-it/i-nostri-marchi/) and [Le Nostre Stelle](https://www.eurospin.it/le-nostre-stelle/).
- [MD brands](https://www.mdspa.it/marchi-md/).
- [Conad brands](https://www.conad.it/prodotti-e-marchi), including Sapori & Dintorni.
- [Lidl's published brand examples](https://www.lidl.it/static/assets/Coupon-Plus-Tabella-Premi-Maggio-1523920.pdf), including Milbona, Crownfield, Sondey and Alesto.
- [IN's official site](https://www.insmercato.it/): own-brand research remains pending; no brand portfolio or private-label relationship is inferred.

An OFF `stores_tags` association plus Italy country tag is required for every
import. This is contributor evidence, not proof of current retailer stock.
Brand spelling never grants retailer association. Multiple retailers share one
canonical GTIN identity and one selected formulation; equivalent UPC/EAN padding
cannot produce duplicate products.

## Data and verification architecture

The immutable SQLite database uses normalized `products`, `product_sources`,
`product_retailers`, `product_assessments`, metadata and import-run relations.
Canonical identity and exact barcodes are unique/indexed. Import values use
prepared statements, foreign keys and transactions. A failed analysis rolls the
transaction back. Repeated identical runs do not duplicate records or run IDs.
The database is built outside `dist/`, explicitly included in the existing
Vercel function, and opened **read-only** by the GET endpoint. There is no public
write/import API. No new service key, environment secret or runtime dependency.
`node:sqlite` is provided by the existing Node 24 runtime.

This choice isolates the public reference catalogue from private Supabase
analytics; Supabase migrations and new RLS policies are unnecessary here.
Existing Supabase security regression tests still run. If mutable shared storage
is introduced later, that is a separate reviewed migration with its own RLS.

Source text is retained separately from assessments and hashed unchanged.
Verification requires a versioned packaging-review entry bound to exact barcode,
identity (name/brand/size), full original ingredient hash and source revision.
It includes timestamp, review ID, full-label/identity confirmations and licensed
barcode/ingredient photos with matching GTIN paths and SHA-256 hashes. Missing,
expired, conflicting, truncated, corrupt or unreviewed low-confidence evidence
cannot pass. `data/italy/reviews.json` is deliberately empty for this release.
Synthetic test reviews never enter release data. This is a documented review
attestation gate, not a claim that a URL/hash automatically verifies packaging.

Fresh verified records are eligible for 90 days after review. Missing fields
are INCOMPLETE; usable identities with uncorroborated ingredients require review;
contradictions/obsolete records are rejected. New ingredient/identity hashes or
source revisions invalidate old reviews. Contradictory snapshots are withheld,
not merged. Older or unchanged weaker evidence cannot silently replace stronger
reviewed evidence or renew its age. Obsolete/conflicting evidence is withheld.
All retained assessments are recalculated with the existing universal policy
version on maintenance; there is no second halal rulebook. Unknown sources,
gelatin, enzymes, rennet, alcohol and E471 retain existing uncertainty handling.
Certification remains separate and not verified.

## Lookup and user experience

Shared camera, barcode-image and manual entry already use the same repository
and checksum validator. The server checks the local indexed catalogue before
OFF cache/cooldown/network access. A known product therefore remains available
during external outages, including an OFF 429 cooldown. Unreviewed, stale and
rejected research labels are withheld from the public analyzer: no unsupported
HALAL **or HARAM** conclusion can arise from them. Source text is available only
in the explicitly requested licensed research download.

Known missing, awaiting-review, stale, conflicting, genuinely not-found and
temporary network failures retain distinct evidence/status paths. The premium
result uses one brief explanation, the existing ingredient-photo/manual options,
three clear status colours and unaltered source product names. Two new messages
have all twelve translations, with Arabic/Urdu RTL; native review is pending.
Photos are validated against the scanned identity by the existing presenter.

Browser records remain bounded to 100/one-hour freshness, seven-day explicitly
stale offline fallback, coalescing and language-aware keys. Old OFF-only caches
cannot mask the new catalogue online; their offline fallback is retained without
deleting settings/history/consent/Auth storage. Runtime responses are validated,
including catalogue states that must not carry unreviewed labels. No barcode,
product names or ingredient text is added to analytics.

The catalogue is not downloaded at startup. OFF/decoder/OCR remain lazy. API
responses are small; the existing ingress limit also protects local reads.
Static DB contents cannot be updated independently of a reviewed build. Runtime
access is read-only. Per-instance upstream limits remain **not a durable global
quota**; prior OFF capacity risks still apply to unknown-code fallbacks.

PWA cache version is v10; `/api/`, `/admin` and explicit `/catalogue/` downloads
are excluded. Automated tests simulate the existing production v6 upgrade and
interruption without clearing personal storage. These do not prove a physical
installed Android PWA update.

## Reproducible maintenance

1. Inspect CSV allocations with `node scripts/catalogue-queue.cjs LOCAL_CSV`.
   This imports no products or verification states.
2. Preferred expansion: obtain the permitted official OFF JSONL(.gz) bulk export
   using OFF's documented download route, then run
   `node scripts/catalogue-ingest-bulk.cjs LOCAL_JSONL_OR_GZ RETRIEVED_AT_ISO`.
   The reader streams, filters Italy + the six retailer tags, bounds records to
   1 MiB and retains at most 1,000 candidates per retailer. Inspect the generated
   batches before adding them to the feature branch. No sequential product reads.
3. Optional selective Parquet research: install a pinned official DuckDB client
   under ignored `.release-private/catalogue-research` (the attempted client was
   `@duckdb/node-api@2.0.0-r.1`, not an app dependency), then run
   `node scripts/catalogue-bulk-parquet.cjs`. Its output stays research-only.
   It pins the dataset revision, bounds memory/threads, disables HTTP retries and
   has a two-minute deadline. This route did not yield records in this session.
4. Small discovery only: `npm run catalogue:discover`. It skips recorded batches,
   uses one page of 100 per retailer, spaces requests at least 6.5 seconds and
   stops on overload/rate limits. It is manually triggered, never scheduled in
   the app, never invoked at build, and must not be repeatedly run under 503/429.
5. For licensed local ingredient photos, create bounded hash-checked jobs in
   `data/italy/ocr-jobs.json` and place files in ignored
   `.release-private/catalogue-images/`. `npm run catalogue:ocr` uses installed
   local Italian Tesseract models; no photos leave the machine. Confidence >=90
   plus complete normalized text containment only creates a corroboration
   candidate. OCR never writes reviews or automatically promotes products.
   Exact identity and full-label evidence still need a reliable packaging review.
   An explicitly synthetic Italian image exercised this command at confidence
   95 with a complete normalized text match and zero promotions. Tesseract
   emitted an `ita.special-words` dictionary warning; the extraction completed.
   No real packaging OCR pass is implied by that research-tool check.
6. `npm run build` creates a clean deterministic release from recorded inputs.
   On a prepared checkout with compiled tooling, `npm run catalogue:maintain`
   instead transactionally updates a temporary copy of the current local DB,
   reassesses all retained records and atomically swaps it, retaining `.rollback`.
   `node scripts/catalogue-rollback.cjs` restores that local artifact after an
   integrity/schema check; rebuild and QA are required before any deployment.
   Release rollback is to the previous existing-project preview/deployment;
   production rollback/deployment always requires its own authorization.

Run `npm run qa:100`, `npm run typecheck`, `npm run lint`, `npm run build`,
`node scripts/catalogue-benchmark.cjs`, `node scripts/release-manifest.cjs` and
`npm audit`. Generated QA/quality/performance reports contain actual results.
Build timestamps in the licensed download are pinned to recorded source/review
evidence for reproducible asset hashes; runtime expiry uses the real clock.

Final local QA: **832 passed, zero failed/skipped** (610 unit/integration and
222 desktop/mobile browser executions). Strict TypeScript, lint and release
build passed; application dependency audit found zero vulnerabilities. The
licensed download adds two explicit static assets (47 total). On the recorded
local environment, indexed lookup p95 was 0.216 ms (10,000 samples), cache p95
1.021 ms (2,000), and simulated endpoint p95 7.475 ms (1,000 requests across 25
instances, concurrency 40 each). Maximum response was 851 bytes; initial script
growth was 3,197 bytes. No full catalogue download occurs at startup. This is a
98-row dataset benchmark, not proof of a 1,000-row production workload or CWV.
Live hash checking exposed Windows/Linux gzip OS-header differences despite
identical uncompressed catalogue data. The release normalizes that header to
the standard unknown-OS value and regression-tests it, preserving exact hosted
asset hashes. The synthetic preview barcode fixture also uses an explicit white
background; a transparent background is unsuitable for its canvas decoder.

## Licensing and privacy

OFF contributors receive visible attribution and product links. Database reuse is
ODbL 1.0, individual contents DbCL 1.0, displayed unmodified photos CC BY-SA 3.0.
The applicable derivative database, including original labels, provenance and
derived policy assessments, is offered at `/catalogue/italy.json.gz`, under ODbL,
with `/catalogue/LICENCE.txt`. The compact Why control links to it. These terms
also apply to recorded extracts and bounded caches. See
[OFF licensing guidance](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/).
No retailer protected content is imported. No automatic OFF contribution/export
of user scans is added. This technical documentation is not a legal opinion.

Images still load directly from OFF with no referrer; their host sees those
requests. Barcode fallback requests pass Vercel/OFF infrastructure. No additional
scan/product logging or personal analytics fields were introduced. Camera/OCR
files remain local and optional analytics remain consent-controlled.

## Acceptance limits and readiness

Automated coverage includes every imported barcode's exact identity/provenance,
indexed lookup, withheld research evidence, unchanged analyzer invocation and
every catalogue record's desktop/mobile result rendering. Synthetic reviewed
records exercise all three classifications and verification gates. **No real
verified-product tests are claimed: the real verified count is zero.** Existing
scanner/WASM, synthetic image OCR/camera, translations, WCAG, consent, Auth,
analytics permissions, PWA, security and dependency regressions also run.

Local performance budgets are indexed p95 <250 ms, cache p95 <150 ms and initial
bundle growth <15 KB. Measurements and environment limits are in
`reports/italy-performance.json`; no real Android/CWV improvement is claimed.
Physical Android scans, photographed labels, native-speaker approval, installed
PWA updates, low-end devices, authorized real admin statistics and a deployed
1,000-row workload remain unverified. Preview analytics retain existing
production-only CORS restrictions. Do not loosen them for acceptance.

**Production recommendation: NO-GO for a 1,000-verified-product launch.** This is
a working, conservatively gated research-pipeline preview with a substantial
verified-data shortfall. Expansion needs accessible licensed packaging evidence,
then actual review and the same incremental validation. Production has not been
authorized for this feature.
