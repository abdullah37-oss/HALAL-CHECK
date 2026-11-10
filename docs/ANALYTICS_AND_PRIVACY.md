# Analytics and privacy

The private dashboard adapts the supplied navy, cyan, purple and orange visual direction to the existing authorized `admin-stats` response. It never generates production statistics, fills panels with sample data or changes Supabase policies. A signed-in account must pass the existing Edge Function's administrator authorization before any charts are shown. Signing out clears rendered values and pending responses are invalidated.

## Metric definitions

- **Recorded visits:** `page_opened` events, not unique visitors or people.
- **Barcode scans:** `barcode_completed` events recorded after a decoded barcode from live camera or uploaded barcode image; not distinct products.
- **Manual searches:** `manual_lookup` events. These are actions, not distinct products.
- **Successful lookups:** `lookup_succeeded` events.
- **Recorded events:** the API's `totalEvents` aggregate, including all recorded categories.
- **Browser sessions:** the existing consent-bound browser-session identifiers; not unique users.
- **Lookup outcomes:** `lookup_succeeded` compared with `lookup_failed`. An unsuccessful lookup may mean an unknown product, a network failure or invalid identity evidence. The existing events cannot distinguish all causes. These are not camera-decoding outcome categories.
- **Scanner performance:** separate `scan_started` and `barcode_completed` counts. They are unpaired event aggregates, so no camera failure or success rate is inferred. A camera failure rate is explicitly marked **Not collected**.
- **Languages/devices:** existing aggregate categories only. No geography or per-person retention figures are invented.

Activity charts use the returned UTC calendar-day buckets. Weekly views aggregate Monday-based UTC weeks; monthly views aggregate UTC calendar months. Changing grouping does not generate tracking or additional API requests. Date-range selection requests the existing 1, 7, 30 or 90-day backend filter. The chart's accessible table exposes the exact aggregated values. The retrieved timestamp describes the client's latest successful fetch, not a guaranteed server ingestion time.

## Consent and retention

Optional analytics remains disabled until the existing consent choice is `granted`. Core scanning and local history do not require analytics consent. Withdrawal clears the browser analytics session and stops future optional collection. The pipeline does not send raw barcode values, ingredient lists, images, OCR text or passwords as analytics metadata. The existing data-retention target is 30 days; actual deletion depends on the production scheduled purge job, whose configuration is not modified by this release.

Admin routes use existing no-store headers and are excluded from PWA caching. Browser code contains only the public project URL and publishable key. Access tokens are used only in the protected request Authorization header and are not rendered in charts, reports or logs. No production Auth email or account update is performed by deterministic QA; all test Auth and analytics requests are intercepted with synthetic data.

## Authentication and recovery

The reviewed implicit recovery flow is preserved. Both admin entry and password-reset pages use the same pinned Supabase SDK. The dedicated reset form requires an incoming recovery callback, successful SDK initialization, an unexpired session and server-side user verification. An older stored login cannot unlock an invalid callback. Password changes use the official `updateUser({password})` method and clear the form before local sign-out. A previously consumed, expired or malformed email-link error redirect fails closed. Production membership, authentication configuration, database grants and RLS remain unchanged.

Translations use the central persisted language selection on sign-in, dashboard and reset pages. Human review of terminology and religious explanations remains advisable; a translated interface is not proof of legal compliance.
