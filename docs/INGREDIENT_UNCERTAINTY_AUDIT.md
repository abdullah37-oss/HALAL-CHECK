# Ingredient uncertainty audit — 12 November 2026

**Update:** the owner approved fresh validated OFF fallback after this audit.
See [the current fallback release](CATALOGUE_OFF_FALLBACK_RELEASE.md) for actual
endpoint-pipeline results. The original rule/label audit below remains useful;
its pending-policy statements describe the first preview.

This release improves ingredient screening. It does not establish product
certification or remove the separate catalogue packaging-review requirement.
Production deployment and merging are outside this change.

## Reproducible sample and counts

The sample is the existing two attributed Open Food Facts retailer snapshots in
`data/italy/sources/`: 101 source records, 98 unique imported retail barcodes,
73 with ingredient text and 25 without. Products are Italy-tagged community
records, mostly Lidl (97) plus one IN's record, with several European label
languages. This is a convenience sample, not a representative estimate of all
Italian or European supermarket products. No new scraping, production analytics
or product identities were invented. Ingredient completeness is not independently
verified against packaging. ODbL/DbCL attribution and derivative-data obligations
are recorded in `data/italy/LICENCE.md`.

Run from the candidate root after installing dependencies:

```sh
node scripts/ingredient-benchmark.cjs reports/ingredient-baseline.json --baseline
node scripts/ingredient-benchmark.cjs reports/ingredient-after.json
npm run qa:100
npm run typecheck
```

The original three TypeScript rule/policy/analyzer sources are preserved under
`tests/fixtures/ingredient-baseline/`; baseline reproduction does not depend on
unpublished Git history or the current developer's index. JSON reports include
snapshot URLs, retrieval dates, SHA-256 hashes, every sampled barcode, rule
counts, unresolved fragments and the top 30 uncertainty causes.

| Rule metric | Before | After |
| --- | ---: | ---: |
| Unique rule records / IDs | 29 | 50 |
| Permissible rules | 21 | 42 |
| Prohibited rules | 3 | 3 |
| Source-dependent rules | 5 | 5 |
| Alias entries / unique normalized aliases | 159 | 278 |
| Unique normalized alias + translation strings | 411 | 531 |
| Translation slots | 348 | 600 |

**21 new rule records and 119 new alias entries** were added. A rule record can
cover several substances: these counts are not counts of products or an atomic
chemical inventory. There are 12 UI languages, but some translation slots
repeat English fallback text. They are not 600 independently verified language
variants. New aliases principally cover Italian and English; native-language
policy review remains necessary. The reports separately count English-identical
slots. Unknown residual text fragments fell from 451 distinct strings to 310;
fragments include label prose and compound syntax and must not be advertised as
451 unique unclassified ingredients.

| Ingredient-only result, all 98 products | Before | After |
| --- | ---: | ---: |
| HALAL | 2 (2.04%) | 11 (11.22%) |
| HARAM | 4 (4.08%) | 2 (2.04%) |
| NEEDS CHECKING, including missing lists | 92 (93.88%) | 85 (86.73%) |

Among the 73 labels with data, HALAL rose from 2.74% to 15.07%, HARAM changed
from 5.48% to 2.74%, and uncertainty from 91.78% to 82.19%. Nine unresolved
labels became permissible; two false HARAM matches became unresolved, for a
net reduction of seven unresolved products. This is a measured improvement,
not a claim that the third result has been eliminated.

**These are label-engine results. Actual catalogue barcode results remain
0 HALAL / 0 HARAM / 98 NEEDS CHECKING:** its adapter intentionally withholds
all unreviewed ingredient lists. The server returns local research records
before trying live OFF. Thus the current catalogue can mask available live
ingredient data. This release preserves that explicit evidence gate pending
clarification; it does not silently promote community records to verified
packaging. Scanner and manual/OCR label assessment use the improved engine.

## Confirmed defects and corrections

- Decimal commas created fictitious ingredients such as `0` and `5%)`.
  Manual/OCR and OFF mapping now share one parser.
- Entity terminators split `&quot;00&quot;`; supported entities are decoded as
  plain text, never rendered as HTML.
- Italian milk processing descriptions, flour/oil aliases, grain varieties,
  seeds, cocoa, sugars and specified additives lacked coverage.
- Category words such as `addensante` caused a recognized ingredient to retain
  an unknown remainder. Only enumerated grammatical descriptors are ignored;
  unidentified additive names remain material evidence.
- Underscore allergen emphasis is normalized. Parenthetical ingredients remain
  present; nested pork/gelatin are not discarded. Unbalanced brackets and
  ellipses mark evidence incomplete. Allergen and storage prose is otherwise
  retained conservatively rather than broadly deleted.
- `aceto di vino` matched the contained word `vino`; `lievito di birra` matched
  `birra`. A longer specific ingredient shields only its own contained match;
  separate wine or beer elsewhere still triggers HARAM.
- Explicit microbial rennet is distinct from unspecified/animal rennet.
  Generic `caglio` and `rennet` now require source evidence.
- The OFF mapper capped lists at 200 ingredients without marking the list
  partial. Capped evidence now cannot produce HALAL by omission.
- Repeated alias normalization was expensive. Rule aliases are indexed once;
  unknown residuals still prevent broad benign matches from hiding evidence.
- Working QA helpers loaded stale JavaScript while the build used TypeScript.
  The tested candidate uses compiled assets and consistent staged migration
  files, isolated from conflicting working HTML/CSS and `-MSI` copies.

The result card retains its design, exact unresolved label text and separate
certification line. Source uncertainty now has a concise translated message and
an action to ask the manufacturer to confirm the source. Missing, conflicting,
partial and low-confidence OCR data retain their own evidence handling.

## Provenance and policy reasoning

- [EU additive specifications, Regulation 231/2012](https://eur-lex.europa.eu/eli/reg/2012/231)
  identify pectin, guar gum, cellulose derivatives, carbonates, sorbate,
  ascorbic/phosphoric acid and carbon dioxide. Regulatory permission is not
  halal certification; screening judgments and added-carrier limitations are
  recorded separately in each rule.
- [MUIS rennet guidance](https://ask.gov.sg/muis/questions/clks0tqib00qbl90fygbv176e)
  distinguishes microbial/plant sources from animal rennet with slaughter
  requirements. The explicit microbial rule follows this ingredient-screening
  approach; no product certification is inferred.
- [IFANCA enzyme guidance](https://ifancahalal.pk/faqs/)
  also distinguishes enzyme origins and recommends checking manufacturers
  where origin is unspecified.
- [SANHA vinegar guidance](https://www.sanha.org.za/ebull/ebull53.htm)
  supports the existing default distinction between vinegar and an alcoholic
  beverage. Interpretations and stricter processing standards can differ.
- [OFF reuse licence guidance](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/)
  describes the database/content/image licences used by the sample.

References were checked on 12 November 2026. Ordinary plant-food additions use
the documented default ingredient policy. This is not a complete religious
standard for production media, processing aids, cross-contact or every school
of interpretation. Gelatin, E471/E472, unspecified enzymes/flavourings and
animal rennet remain unresolved without sufficient source evidence. Generic
flavourings, emulsifiers and enzymes were not made universally permissible.

No independently verified product-specific certification or manufacturer
declaration was available in these snapshots. The existing engine accepts
explicit supported source statements as supplied evidence, while OFF marketing
tags cannot establish certification. A reviewed, version-bound manufacturer/
certifier declaration registry remains unimplemented; no claim is made that a
public label or a client boolean is independent verification.

## Error findings and release limits

Every changed binary decision was reviewed against its retained source label.
The two removed HARAM findings were the brewer's-yeast mushroom burger
`20047504` and wine-vinegar tomatoes `20161330`. Neither was forced to HALAL:
other unresolved label content remains. The two actual wine-containing labels
stay HARAM. Known pork, blood, alcohol, uncertain gelatin/source, missing-data
and OCR gates have regression coverage.

No false HALAL was found in the newly resolved labels or regression corpus.
There is no independently adjudicated, representative product ground truth, so
population false-positive/false-negative rates and a guarantee that errors never
increase are **not established**. Nine new permissible labels describe ordinary
milk/yogurt, rice, spelt, sesame, olive oil, oats, potatoes/salt and explicitly
microbial-rennet dairy under the stated screening policy.

The separate release evidence records final QA, performance, commit and preview.
Production remains unchanged. Remaining work includes the catalogue evidence
policy decision, broader representative sampling, verified declarations, native
translation review and physical-device/network performance validation.

## Top 30 observed uncertain finding causes

Occurrence counts across sampled label findings; multiple causes can occur per
product, including products with another prohibited ingredient. Residual strings
are not necessarily atomic ingredients. See JSON for the complete before/after
comparison.

| Cause | Occurrences |
| --- | ---: |
| source: Flavouring | 30 |
| missing ingredient list | 25 |
| source: Other source-dependent additive | 3 |
| unrecognized/residual: emulsionante: lecitine (soia) | 2 |
| unrecognized/residual: gelificante: pectine | 2 |
| source: Mono- and diglycerides | 2 |
| unrecognized/residual: cultivos microbianos [contienen _leche_]) | 2 |
| unrecognized/residual: emulgente: lecitinas | 2 |
| unrecognized/residual: soja | 2 |
| unrecognized/residual: sciroppo di glucosio-fruttosio | 2 |
| unrecognized/residual: colorante e 150d | 2 |
| unrecognized/residual: acidificante acido fosforico | 2 |
| unrecognized/residual: piseli | 1 |
| unrecognized/residual: consumare entro 2 giorni dall'apertura | 1 |
| unrecognized/residual: peso netto: 400 g peso snocciolato: 280 | 1 |
| unrecognized/residual: 25% noci di acagiù | 1 |
| unrecognized/residual: 25% mandorle pelate. può contenere tracce di altra frutta a guscio (noci di pecan | 1 |
| unrecognized/residual: noci del brasile | 1 |
| unrecognized/residual: pistacchi | 1 |
| unrecognized/residual: noci macadamia) e arachidi. | 1 |
| unrecognized/residual: 35% funghi in proporzione variabile [funghi shiitake (lentinus edodes) | 1 |
| unrecognized/residual: funghi geloni (pleurotus ostreatus) | 1 |
| unrecognized/residual: funghi famigliola gialla (pholiota mutabilis)] | 1 |
| unrecognized/residual: 24% farina di soia ristrutturata e reidratata | 1 |
| unrecognized/residual: 5% funghi porcini (boletus edulis e relativo gruppo) | 1 |
| unrecognized/residual: glutine di frumento | 1 |
| unrecognized/residual: amido di tapioca | 1 |
| unrecognized/residual: fibra vegetale (pisello) | 1 |
| unrecognized/residual: amido di pisello | 1 |
| unrecognized/residual: preparato per brodo vegetale [sale | 1 |
