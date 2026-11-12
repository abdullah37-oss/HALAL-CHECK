# HalalCheck Smart Assistant

This is a **deterministic, rule-based conversational assistant**, not a large
language model. It uses no Gemini, OpenAI, paid inference, API key, payment method
or billing activation. AI inference spending is EUR 0 by construction. Existing
hosting and free-data-provider capacity limits still apply; neither is described
as unlimited.

## User experience

The separate `/assistant/` page is linked from the homepage, desktop sidebar,
mobile navigation and product result. The result link passes only a barcode in
a URL fragment; it never places ingredients or conversation text in a URL.
Assistant code is absent from the initial homepage script dependencies. Local
OCR and barcode WASM modules load only after a relevant photo is selected.

Users can choose Ask, Product name, Barcode or Ingredients. Recognized question
patterns in the twelve supported UI languages and explicit follow-up buttons
provide explanations, missing-evidence guidance and source links using current
product context. Unsupported questions are not answered with invented prose.
An ingredient reference such as E471 is labeled as general ingredient guidance,
not a product decision. A product name or front-photo title cannot establish a
HALAL/HARAM result.

Name searches return candidate identities with barcode, brand and stated size.
Users confirm the exact brand/flavour/size variant before selecting a barcode.
The normal validated barcode lookup retrieves its ingredients. Only the existing
policy engine computes the decision; source gaps, conflicting/partial labels,
gelatin/rennet/emulsifier/flavouring uncertainty and unknown compounds retain
NEEDS CHECKING. Ingredient assessment remains separate from certification.
The assistant does not infer a certification from product names or OFF tags.

Ingredient-label photos are processed on the device with the existing bounded
local OCR worker. Users review/edit every word and confirm completeness before
analysis. Low recognition confidence still prevents a binary result. Front
photos yield a reviewable search query only. Barcode photos use the real local
WASM decoder. Invalid MIME/signature, size/pixel limit, cancellation, worker
failure and unreadable input retain a manual-entry path.

## Data and privacy

- Chat context is held in memory for this tab, capped at 40 rendered messages;
  clear/reload removes it. It is not sent as a conversation to any server.
- Photos and ingredient analysis stay on the device. No upload endpoint exists.
- Only product-name or barcode lookup terms are submitted to the application
  APIs. A separate, default-off online choice permits those lookup terms to go
  to Open Food Facts; it does not permit photos, ingredient lists or full chat
  context to be uploaded.
- Local catalogue name search can be used without contacting OFF. Cached query
  keys/results are bounded and short-lived server memory, not chat storage.
- The assistant page does not load analytics. Messages, images, names and
  ingredient lists are never added to analytics metadata.
- Storage denial is handled without inventing consent or blocking startup. The
  existing root controller now tolerates denied local/session storage; analytics
  consent fails closed if storage cannot be read.
- Untrusted input and source values render through DOM textContent. Source links
  are constrained to the actual OFF product host/path and matching barcode.
  No retrieved text is executed or interpreted as model/system instructions.

## Free search endpoint

`GET /api/product-search?q=...&lang=...&online=0|1`

The response contains at most 12 candidate identities and no ingredient-derived
decision. `classification` is explicitly null. The endpoint uses a read-only,
parameterized SQLite query over the existing attributed catalogue first. With
explicit online selection it uses OFF's official free Search-a-licious API, limiting
requested fields to identity/brand/quantity. OFF v2/v3 structured search does not
support general full-text names and is not misused as though it did.

Controls: 3–100 query characters, supported-language allowlist, rejected unknown/
duplicate parameters, GET only, same-origin browser restrictions, fixed upstream
host/path, no forwarded credentials, redirect rejection, 5-second upstream
timeout, 1 MiB response bound, 12-result limit, deduplication, at most three
pending searches and six new provider calls/minute per warm instance. Public
ingress is capped at 30/minute per instance. Cache: at most 64 entries, ten-minute
TTL, separated by language. No search-as-you-type and no automatic retries.
Provider Retry-After/cooldown is retained; outages and rate limits are distinct.
These are application controls, not a claim of a global provider SLA or billing
guarantee. Product barcode lookup retains its existing independent controls.

The deployed API uses the real provider. Local QA serves an injected unavailable
provider so the test suite cannot issue bulk external requests. Source fixtures,
mocked failures and real live probes are reported separately.

OFF sources retain attribution, product links and ODbL/DbCL handling. No protected
retailer/manufacturer pages are scraped, no search snippet is promoted into an
ingredient list and no missing ingredients are invented. If the free provider
is unavailable or evidence remains incomplete, the user is asked for a full
ingredient label. Supabase migrations, RLS, owner enrollment, Auth and reporting
authorization are unchanged.

## Validation and limits

Tests cover structured intents, source URLs, exact variant selection, original
ingredient policy, missing/partial/conflicting data, title-only and front-photo
non-classification, injection/XSS, provider failures/cooldowns, bounded caching,
request flooding, real local OCR/WASM, cancellation, twelve-language/RTL layouts,
storage failure, accessibility and offline PWA use after a controlled online
visit. Native-speaking policy/translation review, physical Android use and live
owner login remain separate from browser simulations. Free-source completeness
and availability cannot be guaranteed. The assistant is not an open-domain
generative chatbot or a halal certifier.

The final release report contains actual test counts, browser compatibility,
performance, live preview outcomes and a GO/NO-GO decision. Production requires
the owner's separate approval after release gates pass.
