# Translation coverage and review

The central source `src/i18n/index.ts` retains all twelve existing languages:
English, Italian, Arabic, Urdu, Hindi, Bengali, French, German, Spanish, Turkish,
Malay and Indonesian. Browser code is emitted to the existing public JavaScript
path. Both administrator pages load the same catalog as the consumer app.

Each declared English phrase has a corresponding explicit non-English catalog
entry. Non-English dictionaries do not inherit a blanket copy of the English
catalog. `coverage` reports missing entries, `missingKeys` records requested
missing keys, and `register` supports feature-owned extensions with honest
coverage reporting. Missing runtime phrases fall back predictably to English;
that fallback is not counted as a translation.

`apply` handles declarative `data-i18n`, placeholders, accessible labels and
legacy English text fragments. A source/rendered pair prevents language changes
from translating an already translated string and prevents dynamic errors from
being replaced by an older loading message. Arabic and Urdu set the document
language and RTL direction. Barcode numbers, email/password inputs and quoted
source evidence can preserve their own direction. HalalCheck remains unchanged.

Translations in this development branch are machine-assisted editorial drafts,
not independently reviewed translations. Native speakers should review every
locale before production, especially consent disclosures, administrator errors,
OCR uncertainty, ingredient descriptions and distinctions between halal,
certification and source-dependent assessment. No missing-key test can prove
linguistic accuracy, and a zero missing-entry count is not that claim.

Ingredient names as quoted on packaging, product names and named external data
sources may remain in their original language. Translated ingredient-record
explanations provide concise default-policy screening summaries; detailed source
conditions remain in the source records and policy documentation. OCR language
support is independent of interface language support.
