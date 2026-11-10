# Homepage upload and premium results — preview release

Starting branch/commit: `feature/simplify-scan-results` at `fa891d287e03a4f76444a846cd27748de671bbc6`. Follow-up branch: `feature/homepage-upload-premium-results`. This builds on the existing OFF integration and simplified results. Production promotion and branch merging are not authorized.

## Homepage upload

The scan card shows Scan Barcode, Enter Barcode, Upload Picture in that order, with Upload Picture on the right on wide desktops. Mobile uses two comfortable first-row actions and a full-width upload action. The image icon is decorative; the button retains a readable accessible name.

Upload Picture opens the browser/OS image picker. After selection, a native modal asks Barcode Photo or Ingredients Photo. The app always asks rather than guessing the photo's purpose. Barcode files use the existing real WASM decoder and exact-product repository; ingredient files use the existing local OCR worker, editable text, full-label confirmation and recognition-confidence safeguards. Cancelling the picker/modal does not run analysis. Escape closes the modal, focus returns to the upload button, and Tab/Shift+Tab remain inside the chooser.

The shared existing file validation still limits JPEG/PNG/WebP to 12 MiB and decoded images to 24 megapixels, verifies signatures, and rejects corrupt/unsupported files. Readable errors replace technical module/worker error strings. OCR failures leave confirmation disabled and offer manual entry. Files stay in memory on the device and are released after the workflow; they are not sent to OFF or analytics. Device gallery/cloud locations work through whatever files the OS exposes to its picker; no cloud-storage integration or credentials were added.

## Correct product photos

The existing API request already retrieves the OFF front-image fields. The adapter now prefers `image_front_url`, falling back to the smaller front image. This is the only API mapping change; endpoints, identity validation, language fields, cache/TTL, quotas, retries and credentials handling remain unchanged.

The renderer accepts only approved HTTPS OFF image URLs whose numeric `/images/products/` path identifies the validated barcode (including existing equivalent UPC/EAN zero padding). It then considers an exact-identity image from the existing curated catalogue. Duplicate or different-product candidates are rejected. A failed main image tries that one curated fallback, then displays a neutral photo icon and Photo unavailable. The existing catalogue currently has no photo for its retained physical-label record; no catalogue photos or product identities were invented.

Images use reserved dimensions, `object-fit: contain`, asynchronous decoding, lazy loading and no-referrer requests. Status rendering does not await image loading. Alt text identifies the actual product. Visible photo credits link OFF and CC BY-SA; data attribution/ODbL remains under Why? and full ODbL/DbCL/CC BY-SA information remains in About. Community photos can still be outdated or incorrect; barcode/path checks are not an independent physical-package verification.

## Result and ingredient evidence

The responsive layout places a large photo first on mobile and beside the result content on desktop. A single deep-green HALAL card, red HARAM card or amber NEEDS CHECKING card includes a text label, distinctive icon and one short explanation. The public tone is selected independently of internal diagnostic classification strings, with uncertain outcomes always amber.

The compact summary displays at most three unique actual findings: prohibited findings for HARAM, assessed ingredients for HALAL, and uncertain findings/source requirements for NEEDS CHECKING. No ingredient lists or animal sources are invented. Missing/incomplete data is stated explicitly. Low-confidence OCR does not turn prohibited-looking text into a confirmed HARAM summary. Scan Ingredients opens the existing ingredient-file workflow area when more evidence is needed.

Certification stays a separate compact line using the existing trusted flag; OFF marketing/vegan/nutrition labels do not verify certification. Why? stays short and collapsed. Raw identity comparisons, API payloads, timestamps, report downloads and large error-report sections remain absent. Detailed typed evidence remains available at debugger breakpoints without adding product logging. Existing discreet feedback in About remains available.

## Validation and limits

All new strings have explicit draft translations in the existing twelve languages, with Arabic/Urdu RTL and original product/ingredient wording retained. Native-speaker approval is not claimed. Tests cover keyboard focus, live status regions, alt text, contrast, narrow layouts, three statuses, relevant/long ingredient lists, missing/slow/broken/wrong-product images, attribution, cancellation, invalid files, real local decoding/OCR, and OCR review gating.

The service-worker version changes from v8 to v9. Existing production-v6-to-candidate upgrade/interruption regressions still verify settings, history, consent and synthetic Auth-storage preservation. Scanner/OCR modules remain lazy-loaded; first offline use may require a prior online download, and unavailable processing gives a manual fallback.

Run `npm run typecheck`, `npm run lint`, `npm run qa:100`, `node scripts/release-manifest.cjs`, and `npm audit --json`. Exact final counts are recorded in `reports/qa-summary.json`. Browser pictures and package images used by deterministic tests are synthetic fixtures, not physical-device evidence.

Actual Android camera/gallery/cloud-provider behavior, photographed-label OCR accuracy, native-speaker review, installed-production-PWA updates and low-end-device performance remain owner acceptance checks. The protected preview must separately pass deployed hashes/headers and browser workflow checks. Real authorized analytics stays restricted by existing production-only CORS; it is not claimed verified on preview.

No Supabase authentication, administrator account, RLS, CORS, credentials, CSP or production-domain configuration changes are included. OFF's existing per-instance budgets are not a durable global quota; capacity review is still required before broad production use. Recommendation: GO for preview acceptance after automated/live verification; production remains NO-GO until owner acceptance of these limitations and explicit approval of an exact commit.
