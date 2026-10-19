# Implementation and verification

This ledger describes the local sandbox build. A milestone with outstanding release criteria is not marked complete merely because the implementation or bundle exists. The requested lilac visual system is shared across web and native screens. The latest testing scope is **physical iPhone through iPhone Mirroring; Android testing is deferred at the user's request**.

## M0 — Foundation: local slice verified; staging gates open

Implemented the pnpm/Turborepo workspace, Next.js, Expo, FastAPI, PostgreSQL models/migrations, shared schema/tokens, environment examples, setup scripts, health endpoint, Docker configuration and CI workflow. Both clients call the same authenticated API. Local development sessions are signed, revocable and disabled in production configuration. Supabase Auth/JWKS and private Storage adapters are implemented behind configuration.

Verification: strict TypeScript in all six packages; mypy in 12 Python source files; Ruff; schema tests; API tests against an isolated PostgreSQL database; migration upgrade/downgrade/upgrade with RLS enabled on all 17 application tables. Web production build and iOS bundle export pass.

Open: dedicated Supabase credentials and provider flows, remote CI, Docker execution, signed native distribution, hosted deployment. The local database and auth adapter are deliberate development defaults, not evidence of a working hosted Supabase deployment.

## M1 — Accounts, profile and navigation: local slice verified

Implemented registration/sign-in/sign-out/session refresh, profile and shop settings, personal spaces, sandbox seller enablement, and exactly Discover, My Space and Settings navigation destinations. Nested seller, cart and order screens retain those destinations. Profile edits no longer change a shop's separate display name.

Verification: API authentication/revocation/ownership tests; browser profile/favorite flow; physical iPhone sign-in, all three navigation destinations and persisted session/settings after app reload. See [IPHONE_QA.md](IPHONE_QA.md).

Open: real Supabase email confirmation/recovery and account deletion, full device screen-reader and large-type coverage.

## M2 — Renderer and eight themes: web verified; device matrix open

Implemented a strict versioned JSON Schema, thirteen block types, safe links, bounded style/layout controls, shared responsive rules, eight themes and public server-rendered shop/product/profile pages. Web and native use the same published documents and separate platform renderers.

Verification: 17 schema/renderer tests, invalid markup/link/structure API coverage, responsive web overflow checks and screenshots at 320, 390, 768 and 1280 pixels; successful iOS bundle export.

Verification now also includes the customized Minimal Studio storefront on the physical iPhone in editor and buyer modes. All-theme device inspection remains open. Android device inspection is deferred. Native uses platform typography and does not promise identical pixels to the browser.

## M3 — Storefront editor: substantial implementation; acceptance matrix open

Implemented the desktop three-pane editor, mobile web inspector and native inspector sheets; block add/duplicate/delete/reorder; web library/layer drag/drop; native long-press selection plus destination/arrow controls; content/style/layout/responsive inspectors; rich text, links, nested columns, collections, images/alt text/focal crop, fonts, palette, gradients and spacing. Includes 50-step history, autosave, offline local recovery, conflict preservation, immutable versions, atomic publish, restore and backups before replacing a layout.

Verification: browser tests cover add/duplicate/reorder/delete persistence, draft/public separation, publish/restore, stale revision preservation, offline recovery and responsive widths. API tests reject invalid schema, foreign/private assets, foreign collections and severe contrast errors. Physical iPhone tests verify heading/font/size/background, autosave/reopening, publication/buyer view, layer arrows, undo/redo, preview and restoring an earlier publication into a draft without changing the public shop.

Open: finish E01–E15 on the physical iPhone, especially image permissions/crop, all templates, rich text, nested blocks, offline recovery, add/duplicate/delete/long-press gestures and accessible focus. Native continuous animated gesture drag/drop remains incomplete. Native reorder currently uses long-press selection and explicit destination/accessibility controls. Comprehensive keyboard/screen-reader acceptance is not yet established. M3 is not declared release-complete.

## M4 — Catalog and discovery: sandbox slice verified

Implemented products with variants/prices/stock, image selection, publication/archive, collection creation/editing/product ordering on web and native, public catalog, bounded search/category/stock/price filters, favorites and follows. Collection changes enforce ownership, unique products and shop membership. Counts derive from stored records; fictional fixtures carry no invented review/verification claims.

Verification: API public/private catalog, follow/favorite idempotence and ownership tests; browser search/filter/saved flows. Eight sample shops and 24 products each have two variants; sample history created during tests is sandbox data.

Physical iPhone product editing and collection ordering are verified. New product/collection creation and image uploads still need device coverage. Large-catalog indexed ranking/UI pagination and approved seller imagery are pilot work.

## M5 — Sandbox commerce: local slice verified

Implemented per-shop carts, authoritative quote, row-locked inventory reservation, idempotent checkout, timestamped HMAC sandbox webhooks, order/refund/cancellation states, reservation expiry worker, buyer/seller order pages, shipping/tracking, report intake, moderation queue and audited shop suspension. Prices remain MYR minor units; checkout explicitly identifies the sandbox.

Verification: integration tests cover price tampering, final-unit contention, duplicate webhook processing, incorrect amount rejection, cross-user order access, refunds/failure/expiry and seller fulfillment. Browser checkout/payment/refund flow passes against the sample shop. No live charges or payouts are enabled.

Physical iPhone purchase/refund is verified: selected RM73 variant + RM8 shipping = RM81, then refund with stock restored. Open: scheduled production worker/outbox, external provider/legal approval and staffed moderation.

## M6 — Polish and pilot: in progress

Implemented the lilac visual system, locally bundled fonts/licenses, responsive layouts, safe focus management for principal dialogs, metadata/sitemap/robots, onboarding copy, operational notes and CI configuration.

Latest completed checks:

- Schema/renderer: **17 passed**, including heading-font override regression.
- PostgreSQL API integration: **18 passed**; one upstream Starlette test-client deprecation warning.
- TypeScript: **6 packages passed**. Python: **12 source files passed**, Ruff passed.
- Production web build: **passed**.
- Desktop browser regression: **11 passed** against the production build, including template preview/application/backup/undo, collection editing/focus restoration, editor recovery, heading-font persistence and sandbox checkout/refund. The final focused template check also passed after contrast refinements, including a gallery accessibility scan with zero violations. No mobile emulation was used in these runs.
- iOS bundle export: **passed**, including the latest native storefront changes.
- SDK 57 upgrade: **21/21 Expo Doctor checks passed**, Expo dependency check passed, no pnpm peer dependency issues; strict TypeScript and iOS bundle export passed after aligning native animation/worklet peers.
- Migration upgrade/downgrade/upgrade: **passed**, 17 tables with RLS.
- Discover automated accessibility scan: **0 violations** in the saved route-specific report; this is not a full accessibility audit.

Physical iPhone smoke testing is complete for the core flows recorded in [IPHONE_QA.md](IPHONE_QA.md), with screenshots and API readback evidence. Expo account sign-in and SDK compatibility are resolved. No credentials were requested in chat. No emulator testing was continued after the user's device-only instruction; Android remains deferred. The phone walkthrough is a smoke test, not a claim that all native release criteria pass.

The subsequent [design refresh](DESIGN_REFRESH.md) adds polished shared sheets, motion, revised Discover/My Space layouts and eight differentiated templates with full previews. Actual iPhone checks verified template application/backup/undo, block add/undo and the new editor/product/collection sheets. The final draft matches the public lilac design.

Pilot completion is blocked on verification and the remaining work listed in [PILOT_READINESS.md](PILOT_READINESS.md), including signed installable staging builds, real-device QA, accessibility, performance/security reviews and hosted deployment. M6 is not complete.

The template layout revision replaces generic artwork with actual scaled document previews and eight different structures. Native mobile grids and direct nested-card editing are verified on the physical iPhone; browser coverage checks all eight previews and nested keyboard selection. See [design refresh](DESIGN_REFRESH.md).
