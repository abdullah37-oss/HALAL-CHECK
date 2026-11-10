# Scanner and ingredient-label recognition

HalalCheck provides live barcode scanning, local barcode-image reading and local
ingredient-label OCR. All methods feed the existing validated product repository
and ingredient analyzer; OCR text must be reviewed before classification.

## Root causes and repairs

The original scanner only constructed the browser `BarcodeDetector`. On browsers
without that API, the camera opened but decoding never ran. Its frame loop did
not wait for ready video data. Separately, the result UI called the synchronous
catalogue getter rather than the repository's existing Open Food Facts lookup,
so a correctly read unknown barcode could never fetch remote product evidence.

The replacement uses an explicitly filtered native reader when all four retail
formats are supported, otherwise the locally served ZXing-C++ WebAssembly reader
from `zxing-wasm`. Native frame failures also fall back to WASM. Video is played
and checked for ready data; decoding is throttled to at most four frames per
second and captured frames are bounded to 1280 pixels wide. A successful decode
stops the stream before one product lookup. Generation counters reject late
permission, image and lookup results after navigation. Navigation, visibility
changes and page dismissal release media tracks. Camera switching is offered
only when multiple video inputs are enumerated; torch is offered only when the
active track advertises support and can be toggled off.

`productRepository.lookup` now supplies the result screen. API responses retain
barcode identity validation and timeouts; late results cannot reopen a closed
view. Manual ingredients and confirmed OCR deliberately bypass remote product
lookup and remain labelled user evidence.

## Formats and image handling

EAN-13, EAN-8, UPC-A and UPC-E are supported by the WASM reader. ZXing returns
canonical EAN-13 representations for UPC-A and expanded UPC-E symbols. This is
barcode normalization, not a product identity claim. The local catalogue and
repository preserve returned-code verification.

JPEG, PNG and WebP are accepted, with a 12 MB file limit, file-signature checking,
24 megapixel limit and decoding validation. SVG, GIF, PDF and HEIC are excluded;
convert unsupported images to a supported format first. File selection uses the
OS picker, including cloud-backed files exposed by the OS. Choosing an ingredient
photo can invoke the camera on mobile using the standard file capture hint.
Images are held in memory, processed locally and released; they are not added
to scan history, analytics, Supabase or Open Food Facts requests.

## OCR

Tesseract.js runs in a same-origin web worker. The API wrapper, worker, WASM core
and compressed language models are bundled from pinned npm dependencies and
served by the existing application. No external OCR service receives images.
The initial application bundle does not contain the OCR core or language models;
these are requested only when the user selects an ingredient image. English,
Italian, Arabic and Urdu OCR models are selectable. OCR language is independent
of the twelve interface languages. Mixed-language or curved/glare-heavy labels
may require manual transcription. Models and WASM can consume substantial memory
and take longer on low-cost phones; there is no claim of physical-device timing.

Recognized text is editable, capped at 10,000 characters and never immediately
classified. The owner must compare it with the packaging and explicitly confirm
that the complete ingredient list is legible and included. Empty/unreadable text
cannot enable analysis until corrected and confirmed. OCR confidence and label
completeness are passed separately to the analyzer. Recognition uncertainty is
not evidence that an ingredient is permissible; ingredient-source uncertainty
remains a separate classification concern. Cancel/navigation terminates the
worker, including when cancellation arrives during initialization.

## Verification and limits

Fixtures under `tests/fixtures/barcodes/` are genuine PNG retail barcodes generated
with BWIP-JS. `tests/browser/scanner-image.spec.cjs` decodes their pixels using the
actual WASM reader with native detection removed, exercises image validation,
uses an actual local Tesseract worker on a rendered ingredient label, verifies
mandatory review and checks that OCR generates no third-party image requests.
Deterministic media-stream tests cover duplicate and stale-result handling;
these are simulations, not physical-camera validation. Full final outcomes are
recorded in `FINAL_QA_REPORT.md`.

Physical Android Chrome/iOS devices are not connected to this workspace. Before
production approval, manually check:

1. On HTTPS, grant camera access and scan a sharp EAN-13, EAN-8, UPC-A and UPC-E.
2. Confirm one result opens per scan, then return and scan another product.
3. Switch cameras and toggle torch when supported; deny/revoke permission once.
4. Leave the scanner/background the app and confirm the camera indicator clears.
5. Select one barcode photo from gallery and one ingredient label; correct one
   OCR word, confirm completeness, and inspect the resulting ingredient evidence.
6. Try a blurred label, no-network state and large/unsupported image; ensure
   manual entry stays accessible and no unreadable label receives confirmed HALAL.

Implementation references:
- https://github.com/Sec-ant/zxing-wasm (reader API, supported formats, local WASM)
- https://github.com/naptha/tesseract.js/blob/master/docs/api.md
- https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md

Their upstream licenses are included with the deployed vendor assets.
