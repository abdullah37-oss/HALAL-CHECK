# Smart Assistant release evidence — 12 November 2026

Release scope: `feature/ai-integration-20261112`, based on the tested TypeScript
and ingredient-evidence commit `06a5898e15d35d24e123ec29d1a768a3b4c5de1d`.
The original workspace's staged migration and other existing files were preserved
using an isolated worktree. No published history was rewritten.

## Implementation

The separate premium `/assistant/` page is linked from home, mobile navigation
and product results. It supports exact barcode lookup, free product-name
candidates followed by explicit variant selection, ingredient explanations,
contextual follow-ups and local label/barcode/front-photo processing. Twelve UI
languages and RTL are supported; OCR retains the existing four recognition
languages. It explicitly says it is rule-based, not a language model.

No Gemini, OpenAI, Google paid search, paid inference service, model key, billing
activation or payment method is used. AI inference cost is EUR 0 by construction.
The latest zero-budget instruction supersedes the earlier generative-AI request.
Free hosting/provider quotas still apply; unlimited availability is not promised.

OFF's official Search-a-licious API returns only identity candidates. Titles,
front photos and marketing cannot establish HALAL/HARAM. Exact barcode evidence
passes the existing identity/completeness checks and deterministic ingredient
policy. Missing ingredients and unresolved animal/additive sources remain
NEEDS CHECKING. Certification remains separately unverified without evidence.

Photos and ingredient text remain local. Online barcode/name lookup is opt-in;
conversation is memory-only and bounded. Clear/cancel invalidates pending work
and erases hidden recognized text. Public source links must match the barcode.
No assistant analytics, model requests, Auth or database mutations were added.
Search requests have bounded input, response, timeout, cache and concurrency,
cooldowns, explicit submission and no automatic retries.

Confirmed regressions fixed: denied browser storage could break initialization;
dark assistant/home links failed contrast; invalid OCR confidence (including
NaN) could previously pass the uncertainty gate. Invalid confidence now remains
unresolved. Existing policy rules were not loosened.

The inherited ingredient inventory remains 50 unique records: 42 permissible,
three prohibited and five source-dependent; 280 distinct aliases and 533 distinct
normalized alias/translation strings. Twelve UI languages include 222 English
fallback translation slots; that is not a claim of 12 fully researched ingredient
lexicons. This assistant upgrade adds zero ingredient records. The existing
ingredient audit retains the top 30 uncertainty causes and 310 distinct unknown
strings in its sample (`reports/ingredient-after.json`).

Offline endpoint/mapper/policy replay of the 98 attributed real-product snapshots
is identical before and after this assistant upgrade: 10 HALAL (10.20%), two HARAM
(2.04%), 86 NEEDS CHECKING (87.76%). Seventy-three labels are populated; missing
lists remain in the denominator. The sample is mostly one Italian retailer,
is not representative of European supermarkets and is not 98 live requests or
independent packaging/certification verification. No newly false HALAL/HARAM
decision was observed in this replay or the adversarial fixtures; these checks
cannot establish real-world false-positive/negative rates without independent
ground truth. See `reports/smart-assistant-policy-parity.json`.

## Evidence and release gates

- Untouched baseline: 806 unit and 252 Chromium browser cases passed.
- Candidate unit suite: 910 passed, zero failed/skipped, including 94 assistant
  and ten OCR-confidence cases. See `reports/qa-summary.json` and `unit.tap`.
- Final Node 24 QA: 910 unit + 322 desktop/mobile Chromium browser cases =
  1,232 passed, zero failed/skipped. The first complete candidate run exposed
  one theme-transition contrast failure; it was fixed and the full suite rerun
  cleanly. Compatibility and preview outcomes are recorded after execution.
  A loaded login page is not owner-authentication evidence.
- TypeScript checks passed; Biome checked 36 files with no findings.
- Dependency audit: zero reported vulnerabilities at execution time, including
  development packages. See `reports/smart-assistant-dependency-audit.json`.
- Real free-source handler probe: 11 product identities, HTTP 200, about 408 ms,
  classification null. See `reports/smart-assistant-search-live.json`.
- Lab performance: five cold mobile Chromium contexts per scenario, 4x CPU
  throttle. Homepage initial JavaScript grew 2,600 bytes; assistant page-only
  bundle is 48,323 bytes. OCR/decoder/assistant do not load on homepage startup.
  Exact measurements and samples: `reports/smart-assistant-performance.json`.
  Automation interaction timing is not field INP; no physical-device claim.

## Remaining limitations

This useful structured assistant cannot answer arbitrary generative questions.
Free OFF data can be incomplete, inaccurate, unavailable or rate-limited. Product
identity and ingredient completeness checks therefore remain conservative.
Native-speaking translation/policy review, physical Android testing, real owner
login, invitation delivery and production authenticated analytics have not been
independently verified by this upgrade. Mocked admin tests are not live evidence.

No production deployment, migration, RLS/Auth/account change or fake production
analytics was performed. The current production deployment is
`dpl_D9sQSN4gJAL1WHy1A2rA5yeUj3hz`, recorded read-only as a future rollback
target in `reports/smart-assistant-production-target.json`. Homepage, service
worker and admin hashes match the preserved baseline. Rollback would redeploy
that artifact without changing database/Auth state; no rollback was executed
or claimed as an authenticated production rehearsal. No schema change is needed.

Current decision: NO-GO for production. Preview release requires successful
final browser/compatibility checks, privacy audit and independent preview
verification; production always requires the owner's separate explicit approval.
