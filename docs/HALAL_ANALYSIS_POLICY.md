# Halal ingredient analysis policy

HalalCheck screens the ingredients actually supplied by a product source or
confirmed by the user. It is an information aid, not a certification service or
religious authority. Its default screening policy does not assert agreement
between every Islamic authority. A recognized ingredient name is not proof of a
product's certification, production conditions or absence of cross-contact.

## Public results and internal states

- **HALAL**: every identified ingredient is generally permissible under this
  documented default screening policy, with no unknown remainder or incomplete
  evidence flag. This is an ingredient assessment, not a certification.
- **HARAM**: supplied evidence explicitly identifies an ingredient flagged as
  prohibited by the default policy, such as pork-derived ingredients, blood or
  an explicitly named alcoholic beverage/ethanol. The rule does not match an
  arbitrary chemical name merely because it ends in `-ol`.
- **NEEDS CHECKING**: an ingredient is unknown, has an unverified source or
  composition, the ingredient list is missing/incomplete, or image recognition
  is not sufficiently reliable. Internally, `needs-checking` and
  `not-enough-information` retain distinct reasons but share this public result.

Certification remains a separate field and is never inferred from a successful
barcode lookup or from an ingredient assessment.

## Evidence and uncertainty

The central database in `src/data/ingredientDatabase.ts` records aliases,
assessment, explanation, source and conditions. The versioned default policy in
`src/data/universalHalalPolicy.ts` assigns stable identifiers and labels. The
analyzer in `src/utils/halalAnalyzer.ts` gives prohibited evidence precedence,
then source uncertainty, then permissible evidence. A known fragment such as
milk cannot conceal unknown text or a prohibited ingredient in a compound.

Gelatin remains source-dependent; the application does not infer pork or an
acceptable production process from the word gelatin. Emulsifiers, enzymes,
rennet and unspecified flavourings remain uncertain unless the supported source
rule establishes sufficient evidence. An explicit qualifying source statement
for a supported non-gelatin additive is accepted only when it is not negated,
conditional or accompanied by an unknown compound. This is an assessment of the
stated evidence, not independent verification of a manufacturer's claim.

The current policy treats vinegar separately from alcoholic beverages and
avoids the false inference that sorbitol or cetyl alcohol is an alcoholic
beverage by name alone. These are the existing project's screening rules,
retained rather than presented as universal religious consensus. Interpretations
and processing concerns may vary; consult the relevant certifier, manufacturer
or a trusted scholar when the source or standard matters.

OCR uncertainty is separate from ingredient-source uncertainty. Unconfirmed,
low-confidence or incomplete OCR evidence cannot produce a HALAL result.
Users must compare every word against the complete original label and correct
recognition errors. OCR confidence is a model estimate, not a probability of
religious correctness. Text can be perfectly recognized yet still contain an
ambiguous ingredient.

## Parsing and source boundaries

Normalization supports Latin accents, Arabic diacritics/tatweel, Arabic comma
and semicolon separators, and spaced/hyphenated E-numbers. Classification is
invariant under interface language changes. Product identity is checked against
the requested barcode before using external ingredients. Cached products and
remote JSON receive runtime validation; malformed cache entries are ignored.
API ingredients and OCR ingredients are not silently merged when they conflict.

Original product names, ingredient label quotations and source identifiers can
remain in their original language. UI explanations and assessment labels use
the central translation catalog. Translated record explanations are concise
screening summaries; the source records retain the detailed default-policy
conditions. Machine-assisted translations require native-speaker review,
especially for food terminology and religious wording, before a production
release. No automatic translation changes a classification rule.

## Documented changes in 2.0

Policy version `2026.11.10` preserves existing prohibited/permissible records and
adds conservative safeguards: Arabic punctuation/diacritics normalization,
E-number formatting normalization, negative marketing statements do not count
as positive prohibited evidence, a positive source qualifier cannot mask an
unknown compound, and recognition/completeness gates prevent false certainty.
The English public uncertainty label is now NEEDS CHECKING; missing information
keeps its separate internal state. No production database or Auth policy changes
are needed for these client-side changes.

## Regression evidence

`tests/qa/analyzer.test.cjs` preserves all existing record and alias cases.
`tests/qa/analysis-v2.test.cjs` adds Arabic labels, ambiguous gelatin, enzymes,
rennet and E-numbers, source qualification/negation, missing/unknown ingredients,
sugar/fatty alcohol false positives, OCR gates, corrupted external data and
classification invariance across all twelve supported languages.

`tests/qa/i18n-v2.test.cjs` checks every declared phrase has an explicit entry in
each language, detects corrupted Unicode and missing keys, and verifies critical
scanner, consent and Auth phrases. Linguistic correctness still requires human
review. Physical labels, manufacturer evidence and device camera acceptance are
separate from deterministic tests; passing code tests is not certification.
