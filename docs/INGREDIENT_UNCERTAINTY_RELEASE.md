# Ingredient evidence release — 12 November 2026

**Historical first preview.** The subsequently approved fresh OFF fallback is
documented in [the current fallback release](CATALOGUE_OFF_FALLBACK_RELEASE.md).
Its pipeline results and final QA supersede the pending-policy limitation below.

**GO for the verified feature preview. NO-GO for claiming a completed catalogue
rollout or deploying production without approval.**

- Branch: `feature/ingredient-evidence-20261112`
- Tested/deployed application source: `f9cc1abe3960a970ecfe6fe5b2c5a06c032b3a2c`
- [Verified Vercel preview](https://halal-check-cgaziknwa-abdullah-b0a5.vercel.app)
- Deployment: `dpl_Hi33BJBjDtgAbA6YDSKfRVtzRDbW`, target `preview`, Ready.
- [Full ingredient audit and top 30 causes](INGREDIENT_UNCERTAINTY_AUDIT.md)

The preview uses the existing staged TypeScript/catalogue migration as its
baseline, isolated from conflicting working JavaScript/HTML/CSS copies. The
original working branch and index were preserved. Published history was not
rewritten; the feature branch was pushed normally. No merge, force-push,
production deployment, Supabase change, account change or production analytics
write was performed.

## Actual validation

| Check | Evidence |
| --- | --- |
| Full QA, Node 24.22.3 | **1,023 PASS**, 0 fail, 0 skip: 783 unit + 240 desktop/mobile Chromium |
| Browser/worker/API TypeScript | All three configurations passed |
| Candidate lockfile dependency audit | 0 known vulnerabilities |
| Live preview label benchmark | All 98 real sample classifications matched local results |
| Live preview UI | Real yogurt label HALAL; gelatin remains unresolved with exact ingredient/action; Italian guidance; separate wine remains HARAM |
| Live preview assets, headers, endpoint | 54 checks passed; exact bytes or only expected Vercel toolbar HTML injection |
| Preview browser side effects | 0 analytics requests, 0 Auth requests |
| Preview upload privacy | 123 files / 1,525,518 bytes at audit; 0 private/test artifacts. Browser traces were excluded before upload |
| Outgoing Git privacy audit | PASS; no findings; public noreply attribution |
| Production branch | Read-only Vercel API confirmed `main` |

The final source changes have coverage through manual/product parsing and the
actual server-mapped barcode path. QA also covers known prohibited ingredients,
unknown remainders, source-dependent additives, missing/partial data, OCR
confirmation, scanner WASM/native decoding, PWA upgrades/offline behavior,
translations, accessibility, admin Auth/session/authorization simulations and
real SDK regression flows. These simulated admin tests do not prove live owner
login or real production analytics; neither was attempted in this ingredient
release.

## Measured classification and performance

The 98-product ingredient-only benchmark changed from 2 HALAL / 4 HARAM / 92
NEEDS CHECKING to **11 HALAL / 2 HARAM / 85 NEEDS CHECKING**. Percentages:
2.04% / 4.08% / 93.88% before; **11.22% / 2.04% / 86.73%** after. This includes
25 missing lists in both denominators. Nine labels became permissible; two
incorrect prohibited substring matches became unresolved, not automatically
permissible. All changed labels were inspected. No newly found false HALAL in
this reviewed subset is not a population error-rate guarantee.

There are 50 rule records: 42 permissible, 3 prohibited, 5 source-dependent;
278 unique normalized alias entries; 531 unique normalized strings including
translations. There are 21 new rule records and 119 new alias entries. Translation
fallback slots and coarse grouped rules are explicitly distinguished from true
language coverage, atomic ingredients and actual products in the audit.

Local Node 24 measurements:

- Label screening p95: **13.73 ms baseline → 3.50 ms candidate**, 98 labels/run.
- Three engine assets: **+5,302 bytes** bundled, uncompressed.
- Indexed catalogue lookup p95: **0.116 ms**, 10,000 samples; cold open 1.14 ms.
- Browser-style product cache p95: **0.886 ms**, 2,000 samples.
- Local endpoint p95: **6.94 ms**, 1,000 requests, concurrency 40 per instance.
- No initial catalogue download. Physical Android, mobile field Core Web Vitals
  and real upstream network lookup latency were not measured.

These are local microbenchmarks; machine load and JIT affect timing. They provide
no evidence of a material local regression, but do not establish real-world
mobile network performance.

## Remaining genuine uncertainties

The existing catalogue withholds ingredient evidence until packaging review;
all 98 catalogue products therefore still render NEEDS CHECKING through that
path. This is separate from the improved label-engine benchmark. A proposed
fresh, identity-checked OFF fallback is awaiting the user's evidence-policy
choice; it has not been enabled. The gate has not been weakened to increase
the number of binary decisions.

Unspecified flavourings (30 occurrences) and missing lists (25 products) remain
major causes. Gelatin origin/process, E471/E472 fatty-acid source, unspecified
enzymes/rennet and unknown compound contents retain their source requirements.
Allergen/storage prose and incomplete multilingual community labels sometimes
remain conservative residuals. No missing list defaults to HALAL.

No independent product-specific manufacturer/certifier evidence was available
in the sample. A reviewed declaration/certification registry is not implemented;
the release neither invents certifications nor treats OFF marketing tags as
verification. Native translation review, representative ground truth, broader
retailer sampling and packaging verification remain outstanding.

Evidence files: `reports/qa-summary.json`, `reports/unit.tap`,
`reports/browser.json`, `reports/ingredient-baseline.json`,
`reports/ingredient-after.json`, `reports/ingredient-comparison.json`,
`reports/ingredient-dependency-audit.json`, `reports/italy-performance.json`,
`reports/release-artifact-manifest.json`,
`reports/ingredient-preview-verification.json`,
`reports/italy-preview-verification.json`,
`reports/ingredient-upload-audit.json`,
`reports/ingredient-publication-audit.json` and
`reports/ingredient-production-preservation.json`.
