# Implementation and verification

This ledger describes the local sandbox build. A milestone with outstanding release criteria is not marked complete merely because the implementation or bundle exists. The requested lilac visual system is shared across web and native screens. The latest testing scope is **physical iPhone through iPhone Mirroring; Android testing is deferred at the user's request**.

## M0 — Foundation: local slice verified; staging gates open

Implemented the pnpm/Turborepo workspace, Next.js, Expo, FastAPI, PostgreSQL models/migrations, shared schema/tokens, environment examples, setup scripts, health endpoint, Docker configuration and CI workflow. Both clients call the same authenticated API. Local development sessions are signed, revocable and disabled in production configuration. Supabase Auth/JWKS and private Storage adapters are implemented behind configuration.

Verification: strict TypeScript in all six packages; mypy in 12 Python source files; Ruff; schema tests; API tests against an isolated PostgreSQL database; migration upgrade/downgrade/upgrade with RLS enabled on all 17 application tables. Web production build and iOS bundle export pass.

Open: dedicated Supabase credentials and provider flows, remote CI, Docker execution, signed native distribution, hosted deployment. The local database and auth adapter are deliberate development defaults, not evidence of a working hosted Supabase deployment.

## M1 — Accounts, profile and navigation: local slice verified

Implemented registration/sign-in/sign-out/session refresh, profile and shop settings, personal spaces, sandbox seller enablement, and exactly Discover, My Space and Settings navigation destinations. Nested seller, cart and order screens retain those destinations. Profile edits no longer change a shop's separate display name.

Verification: API authentication/revocation/ownership tests; browser profile/favorite flow; earlier native iOS Simulator sign-in/navigation walkthrough. The simulator walkthrough predates the physical-device-only testing request and does not count as physical iPhone evidence.

Open: real Supabase email confirmation/recovery and account deletion, full device screen-reader and large-type coverage.

## M2 — Renderer and eight themes: web verified; device matrix open

Implemented a strict versioned JSON Schema, thirteen block types, safe links, bounded style/layout controls, shared responsive rules, eight themes and public server-rendered shop/product/profile pages. Web and native use the same published documents and separate platform renderers.

Verification: 13 schema/renderer tests, invalid markup/link/structure API coverage, responsive web overflow checks and screenshots at 320, 390, 768 and 1280 pixels; successful iOS bundle export.

Open: all-theme visual inspection on the connected physical iPhone. Android device inspection is deferred. Native uses platform typography and does not promise identical pixels to the browser.

## M3 — Storefront editor: substantial implementation; acceptance matrix open

Implemented the desktop three-pane editor, mobile web inspector and native inspector sheets; block add/duplicate/delete/reorder; web library/layer drag/drop; native long-press selection plus destination/arrow controls; content/style/layout/responsive inspectors; rich text, links, nested columns, collections, images/alt text/focal crop, fonts, palette, gradients and spacing. Includes 50-step history, autosave, offline local recovery, conflict preservation, immutable versions, atomic publish, restore and backups before replacing a layout.

Verification: browser tests cover add/duplicate/reorder/delete persistence, draft/public separation, publish/restore, stale revision preservation, offline recovery and responsive widths. API tests reject invalid schema, foreign/private assets, foreign collections and severe contrast errors. Earlier native simulator editor save was observed; physical iPhone verification remains separate.

Open: perform E01–E15 on the physical iPhone, especially image permissions/crop, font/background changes, rich text, nested blocks, offline recovery and accessible focus. Native continuous animated gesture drag/drop remains incomplete. Native reorder currently uses long-press selection and explicit destination/accessibility controls. Comprehensive keyboard/screen-reader acceptance is not yet established. M3 is not declared release-complete.

## M4 — Catalog and discovery: sandbox slice verified

Implemented products with variants/prices/stock, image selection, publication/archive, collection creation/editing/product ordering on web and native, public catalog, bounded search/category/stock/price filters, favorites and follows. Collection changes enforce ownership, unique products and shop membership. Counts derive from stored records; fictional fixtures carry no invented review/verification claims.

Verification: API public/private catalog, follow/favorite idempotence and ownership tests; browser search/filter/saved flows. Eight sample shops and 24 products each have two variants; sample history created during tests is sandbox data.

Open: physical-device product and collection creation/editing walkthrough. Large-catalog indexed ranking/UI pagination and approved seller imagery are pilot work.

## M5 — Sandbox commerce: local slice verified

Implemented per-shop carts, authoritative quote, row-locked inventory reservation, idempotent checkout, timestamped HMAC sandbox webhooks, order/refund/cancellation states, reservation expiry worker, buyer/seller order pages, shipping/tracking, report intake, moderation queue and audited shop suspension. Prices remain MYR minor units; checkout explicitly identifies the sandbox.

Verification: integration tests cover price tampering, final-unit contention, duplicate webhook processing, incorrect amount rejection, cross-user order access, refunds/failure/expiry and seller fulfillment. Browser checkout/payment/refund flow passes against the sample shop. No live charges or payouts are enabled.

Open: physical iPhone purchase/refund walkthrough, scheduled production worker/outbox, external provider/legal approval and staffed moderation.

## M6 — Polish and pilot: in progress

Implemented the lilac visual system, locally bundled fonts/licenses, responsive layouts, safe focus management for principal dialogs, metadata/sitemap/robots, onboarding copy, operational notes and CI configuration.

Latest completed checks:

- Schema/renderer: **13 passed**.
- PostgreSQL API integration: **18 passed**; one upstream Starlette test-client deprecation warning.
- TypeScript: **6 packages passed**. Python: **12 source files passed**, Ruff passed.
- Production web build: **passed**.
- Latest desktop browser regression: **8 passed** against the production build, including collection editing/focus restoration, editor recovery and sandbox checkout/refund. No mobile emulation was used in this run.
- iOS bundle export: **passed**, including the latest native storefront changes.
- SDK 57 upgrade: **21/21 Expo Doctor checks passed**, Expo dependency check passed, no pnpm peer dependency issues; strict TypeScript and iOS bundle export passed after aligning native animation/worklet peers.
- Migration upgrade/downgrade/upgrade: **passed**, 17 tables with RLS.
- Discover automated accessibility scan: **0 violations** in the saved route-specific report; this is not a full accessibility audit.

Earlier browser runs exercised both desktop and mobile web. Physical iPhone testing is now the requested device path; no emulator testing is being continued. The user installed Expo Go and unlocked Mirroring. Taps and keyboard input now work. On the physical iPhone, Expo Go reported SDK 57 while the project used SDK 54, so the project was upgraded to Expo 57.0.30 / React Native 0.86.3 / React 19.2.3 and the native peer dependencies were aligned. The version mismatch is resolved. The next physical-device screen requires the **same Expo account signed in to both Expo Go and the local CLI**. A browser sign-in handoff is prepared for the user; no credentials were requested in chat. **No successful physical iPhone Lilac app session is claimed yet.**

Pilot completion is blocked on verification and the remaining work listed in [PILOT_READINESS.md](PILOT_READINESS.md), including signed installable staging builds, real-device QA, accessibility, performance/security reviews and hosted deployment. M6 is not complete.
