# TypeScript migration

Strict browser checking uses tsconfig.json (ES2022, DOM, module resolution Bundler, strict=true, noEmit=true). The service worker has a separate strict WebWorker configuration to avoid unsafe mixed DOM/worker globals. No application source uses any, ts-ignore or ts-nocheck.

Converted public controller, analytics transport, service worker, scanner and image/OCR adapters, product model/repository/catalogue, ingredient database/analyzer/policy, translation system, admin controller, runtime configuration validator and password reset controller. Supabase Edge Functions retain their Deno TypeScript runtime and independent check.

Typed interfaces describe products, ingredient evidence, results, Auth sessions, statistics, decoder input/output, image/OCR progress and untrusted API validation. Window declarations describe existing globals while modules remain separately bundled; global load order is intentional in index.html and documented rather than replaced with a framework.

Exceptions: root config.js and admin/config.js contain only public deployment literals; build/QA tools remain CommonJS cjs; test harnesses remain JavaScript; HTML/CSS/SQL/JSON and vendor workers are not TypeScript source. These are deliberate runtime/tooling boundaries. The browser only receives compiled JS and static assets, never raw TypeScript or source maps.

Third-party declaration checking uses skipLibCheck because the pinned Supabase SDK WebAuthn declarations conflict with newer TypeScript DOM definitions, and bundled OCR/ZXing declarations reference Node/Emscripten types. All owned application sources still receive strict checking; no application diagnostic is suppressed.
