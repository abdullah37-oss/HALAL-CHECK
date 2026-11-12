# Fresh OFF fallback — 12 November 2026

This update implements the owner's explicit approval to use the staged migration
as the baseline and allow fresh, identity-checked Open Food Facts lookup for
unreviewed catalogue entries. It supersedes the pending catalogue-policy choice
in the earlier ingredient release report. Production deployment is not approved
or performed.

## Behavior

Current packaging-reviewed catalogue entries retain priority. Quarantined
`REJECTED` entries remain quarantined. Other research/stale entries now continue
through the existing bounded OFF client, including barcode identity validation,
response limits, timeout, retry budget, concurrency controls, deduplication and
rate-limit cooldowns. The handler does not merge older research ingredients into
the new response or promote catalogue verification status.

Fresh source ingredients are assessed under the same policy as other OFF
lookups. Certification is explicitly `not-verified`. Missing/partial/conflicting
lists and unknown/source-dependent ingredients retain uncertainty. Upstream
identity mismatch or malformed data remains an explicit integrity failure.
Availability failures return only the catalogue adapter's withheld ingredients,
with `no-store`; no stored research list becomes HALAL by default. Withheld
responses are not put into the one-hour browser cache, so a temporary outage
cannot hide a later successful lookup. The browser cache generation changes to
`italy-off-v2`, invalidating the old research responses without deleting settings,
consent, history or Auth storage. The service worker already excludes API routes.

The local QA server uses an injected unavailable provider; QA never makes bulk
live OFF requests. Specific fresh-response tests inject licensed snapshots or
clearly synthetic fixtures through the real handler, mapper and browser path.
The deployed API continues to use the real OFF provider.

## Reproducible endpoint benchmark

Run `node scripts/catalogue-fallback-benchmark.cjs` after building. It replays the
same 98 licensed product snapshots through the actual endpoint, OFF mapper and
analyzer with independently bounded injected handlers. It makes **zero network
requests and zero analytics writes**. It does not claim 98 current live lookups,
representative supermarket coverage or throughput beyond the rate budget.

| Actual endpoint pipeline, snapshot replay | Before | After |
| --- | ---: | ---: |
| HALAL | 0 (0%) | 10 (10.20%) |
| HARAM | 0 (0%) | 2 (2.04%) |
| NEEDS CHECKING | 98 (100%) | 86 (87.76%) |

The earlier raw-label benchmark remains 11 / 2 / 85. The endpoint conservatively
withholds one additional permissible-looking water label (`3274080005003`)
because the OFF mapper flags its evidence as incomplete. This distinction is
intentional; raw text recognition does not override product data-quality gates.
The catalogue database itself still has zero packaging-verified products and
retains all original review states. New results come from a separately validated
fresh source, not an invented catalogue verification.

## Validation and remaining limits

Twenty new unit regressions cover approved fallback states, authoritative
packaging/quarantine, permissibility/prohibition/source uncertainty, partial or
missing lists, identity/malformed rejection, outages/cooldowns, deduplication,
cache reuse and old-cache invalidation. Six new browser scenarios per viewport
cover real milk/cheese/wine-containing/unknown labels, outages and cache upgrades.
Full final QA and independent live preview results are recorded with the release
evidence; the earlier release's counts are historical.

No ingredient classification rules were loosened in this update. Browser QA
confirmed two missing English aliases for ordinary milk cultures: `live lactic
ferments` and `lactic ferments`; both now map to the existing permissible culture
rule, like the corresponding Italian label. Counts are 50 rules,
280 aliases, and 533 unique normalized alias/translation strings. Manufacturer
or certifier verification is still not inferred from OFF labels. Representative
ground truth, verified product declarations, physical-device performance and
native-speaker review remain outstanding. A fresh lookup depends on provider
availability and may legitimately remain unresolved.

Evidence: `reports/catalogue-fallback-benchmark.json`,
`reports/qa-summary.json`, `reports/italy-performance.json`,
`reports/ingredient-preview-verification.json`,
`reports/italy-preview-verification.json`,
`reports/release-artifact-manifest.json` and
`reports/ingredient-production-preservation.json`.

## Final local QA evidence

**1,058 passed, 0 failed, 0 skipped:** 806 unit executions and 252 desktop/mobile
Chromium executions under Node 24.22.3. Browser, worker and API TypeScript checks
also passed. All six new fallback browser scenarios pass on both viewports.
The lockfile/dependencies are unchanged from the previously audited candidate.

Final local measurements: indexed catalogue p95 0.174 ms (10,000 lookups),
browser cache-hit p95 2.442 ms (2,000 confirmed hits), cold database open 1.28 ms,
and local outage-fallback endpoint p95 8.37 ms (1,000 requests, concurrency 40 per
injected instance). The endpoint figure excludes live upstream network latency.
Startup-byte delta remains below the existing 15 KB budget; no catalogue bulk
download was added to startup. Physical Android and real network performance
remain unmeasured. All 47 deployment assets were hashed and the preview upload
audit found no private/test-artifact files.
