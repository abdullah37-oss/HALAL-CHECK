# Simplified product results — preview review

Branch: `feature/simplify-scan-results`, based on verified OFF preview commit `7f3c665a87916bb2a48f22c9de8118a5fec663f8`. This includes that unreleased OFF integration; production is not changed by this work.

The result now begins with the original product name and brand. Available photos are optional 64-pixel thumbnails; missing/failed photos leave no empty image panel. One green HALAL, red HARAM or amber NEEDS CHECKING card contains one short explanation. Missing ingredient data reads “Ingredients are unavailable.” beneath NEEDS CHECKING. All internal insufficient/unknown states use the same public NEEDS CHECKING label.

Certification is one line: “Halal certification: Verified” or “Halal certification: Not verified”. This uses the existing trusted certification flag; no new certification authority is integrated. OFF marketing labels, vegetarian/vegan flags and nutrition scores never grant verification. Automated certification-positive cases simulate the existing trusted repository contract; they are not evidence that a real product is certified.

The main result has no identity section, barcode comparison, full ingredient list, data-quality panel, timestamps, report download or error-report panel. “Why?” is collapsed by default and contains only a brief assessment/certification distinction and applicable source/license attribution. Complete attribution remains in About. A discreet About feedback link opens the repository's issue page; no report or product information is submitted automatically.

The analyzer, uncertainty rules, barcode/response validation, OFF proxy, request budgets, privacy controls and Supabase configuration are unchanged. Developers can set a breakpoint in `renderResult`/`showResult` to inspect the retained typed product/evidence/analysis objects and lookup status. No global debug API or new analytics payload is exposed.

All new interface text has explicit entries for the twelve supported languages. Original product names/brands use automatic text direction and are not translated. Arabic/Urdu interface direction remains supported. These are draft translations pending native-speaker review.

The service-worker cache changes from v7 to v8 so approved releases refresh the UI. Existing production-v6-to-v8 regressions check settings, history, consent and synthetic Auth-storage preservation, plus interrupted installation. Physical installed-Android updates remain an owner test after an approved rollout.

Run `npm run typecheck`, `npm run lint`, `npm run qa:100`, and `node scripts/release-manifest.cjs`. The QA summary records exact final totals. Browser regressions cover all three labels/colors, missing ingredients, certification claims, short/hidden details, all twelve languages, RTL, light/dark accessibility, narrow mobile layouts, image failure, feedback access, and the existing scanner/OCR/Auth/PWA workflows. Synthetic camera/OCR fixtures do not constitute physical-device testing.

Only a preview in the existing `halal-check` Vercel project is authorized. Production deployment requires separate owner approval. Existing production-only analytics CORS remains unchanged, so real authorized preview analytics is not an acceptance pass.
