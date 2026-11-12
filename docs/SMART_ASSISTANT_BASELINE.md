# Smart Assistant baseline â€” 12 November 2026

The integration branch starts at verified feature commit
`06a5898e15d35d24e123ec29d1a768a3b4c5de1d`, including the staged TypeScript
migration and approved fresh OFF fallback. The original working branch, index,
older JavaScript and conflict copies remain untouched. The isolated worktree
contains the coherent committed TypeScript baseline.

The source inventory and hashes in `reports/smart-assistant-baseline.json` cover
the browser, scanner/OCR, ingredient policy, product model/repository, OFF client,
catalogue/API, admin/recovery, Supabase migrations/functions, build/QA and tests.
The architecture and privacy/policy/catalogue/PWA/admin reports were reviewed.
The baseline has 50 policy records, 280 aliases and 12 UI languages. Existing
classification, source uncertainty, certification separation and sole-owner
authorization boundaries must remain intact.

Lint and browser/worker/API type checks passed before implementation. The
inherited release has 1,058 passing executions; a fresh complete baseline run is
also being captured. Tests with intercepted Auth/analytics remain simulations,
not proof of live owner login. No production mutation is authorized here.

The owner's updated instruction supersedes the proposed Gemini integration:
**maximum AI spend EUR 0; no paid API, model, billing, payment method or inference
service.** No Gemini key was present and no inference request was made. The
assistant will explicitly identify itself as rule-based rather than a language
model. No SDK/provider credential, quota database or migration is required.

Confirmed baseline technical debt: the main controller accesses browser storage
without handling disabled storage; a denied storage getter can prevent startup.
The new assistant must not depend on persistent storage. Storage handling will
be hardened with regression coverage without changing consent defaults.

Implementation boundaries:

- A separate premium assistant page, linked from home and mobile navigation;
  its code and OCR/decoder dependencies load only when visited/used.
- Structured multilingual intents and contextual follow-ups, using the existing
  deterministic ingredient engine. Product titles never establish a decision.
- Barcode lookup retains exact identity/completeness validation. Name search
  returns candidate variants for explicit selection, then performs barcode
  lookup; it does not import a similar product's ingredients.
- Free OFF full-text search uses its documented v1 CGI endpoint, not v2/v3
  search (which do not support full-text queries). No search-as-you-type, one
  request on explicit submit, bounded response/timeout/cache/deduplication,
  provider cooldown and conservative search budget.
- On-device label OCR requires review and full-label confirmation. Photos and
  ingredient text are never uploaded. Barcode/front photos reuse local tools.
- Only barcode/name lookup terms may go to OFF with a clear online-lookup
  choice. Chat/ingredients/photos never enter analytics or persistent logs.
- No Supabase schema, RLS, Auth, admin enrollment, billing or production change.

OFF documentation checked on 12 November 2026:
[API overview](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/),
[search limitations](https://openfoodfacts.github.io/documentation/docs/Product-Opener/v2/search/get-search/)
and [reuse licences](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/).

Implementation update: the initial CGI plan above was superseded after its
availability probe failed. The implemented provider is OFF's official free
[Search-a-licious service](https://github.com/openfoodfacts/search-a-licious)
at `search.openfoodfacts.org/search`. Its actual `hits` response and brand arrays
are validated; a real handler probe returned 11 identity candidates without
assigning a product classification. See `reports/smart-assistant-search-live.json`.

