# Nook

Nook is a seller-first social commerce app: a cosy corner of the internet where small shops move in, decorate a space of their own with a customizable storefront editor, and sell with sandbox commerce. Its warm, playful identity is documented in [docs/NOOK_BRAND.md](docs/NOOK_BRAND.md). Built from `SOCIAL_COMMERCE_APP_TECHNICAL_SPEC.md` and `AGENT_IMPLEMENTATION_PROMPT.md`.

## Open the app

Local web: **http://127.0.0.1:3000**. API documentation: **http://127.0.0.1:8000/docs**.

Choose **My Space → Open your space → Continue as demo shop owner**. The fictional demo account is `demo@lilac.local` / `LilacDemo!2026` (the address predates the Nook name and is kept so existing local databases keep working). Development credentials only; all seed accounts are local sandbox accounts.

The editor is under **My Space → Customize your space**. Nothing changes on the public shop until you publish. Try all eight templates, change typography/colors/spacing, add photos and blocks, duplicate and reorder them, preview different sizes, publish, and restore an earlier version into the draft.

## Requirements and setup

- Node.js 22, pnpm 11.25.0, Python 3.12, PostgreSQL 17.
- For the current native test: the connected physical iPhone, iPhone Mirroring and Expo Go for SDK 57. Sign in to the same Expo account in Expo Go and the local Expo CLI. Android testing is deferred at the user's request. A physical phone needs reachable API and image hosts configured in `apps/mobile/.env`.

```sh
python3.12 scripts/setup.py
pnpm dev
```

Setup creates an **isolated** PostgreSQL cluster under `.local/postgres` on port **55432**, a non-superuser application role, `lilac` and `lilac_test` databases, a Python virtual environment, random local session/webhook secrets, migrations, sample data and image assets. It does not use a connected Supabase project or touch another running database cluster. On macOS without a `python3.12` alias, use any Python 3.12+ executable to run setup.

Alternatively, start `docker compose -f infra/compose.yml up --build` for the database and API, then `pnpm dev:web`. The container workflow is supplied but has not been run in this environment.

```sh
pnpm install --frozen-lockfile
pnpm dev:web
pnpm dev:api
pnpm dev:mobile
pnpm db:migrate
pnpm db:seed
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm --filter @lilac/mobile export
pnpm api:generate
```

Run web and API before browser E2E. E2E operates against the explicit local **sample shop** and creates/refunds sandbox orders. Python integration tests use only a separate database whose name ends in `_test` and refuse to truncate any other database. Browser tests use installed Chrome; set `PLAYWRIGHT_CHROMIUM=1` to use Playwright Chromium.

To stop/restart the local database:

```sh
pg_ctl -D .local/postgres stop
pg_ctl -D .local/postgres -l .local/postgres.log -o '-p 55432 -h 127.0.0.1' start
```

## Naming

 The product is called **Nook**. Internal identifiers that predate the rename are intentionally unchanged so existing setups keep working: the `@lilac/*` workspace package scope, the `lilac` / `lilac_test` databases and `lilac_app` role, the `lilac-*` browser/secure-store keys, and the demo account address. Renaming them is mechanical but needs a lockfile refresh and a local database rename, so it is left as a separate change.

## What is implemented

- Next.js App Router responsive web, Expo Router native clients, FastAPI and SQLAlchemy, PostgreSQL, Alembic, pnpm/Turborepo, strict TypeScript and mypy, and a generated OpenAPI type contract.
- Exactly **Discover, My Space, Settings** in native tabs and mobile-web bottom navigation; seller tools/cart/orders remain nested screens.
- Email/password development auth using Argon2 and revocable signed sessions. Configurable Supabase Auth registration/password sign-in, refresh and JWKS verification; real Supabase credentials are required to verify that adapter.
- Eight seeded shops/themes, 24 fictional products, two variants per product, eight collections, and a draft distinct from its initial publication. Follower counts and order totals are derived from stored data; no invented ratings.
- A strict versioned JSON Schema shared by TypeScript and Python; thirteen P0 block types; separate web and native renderers using shared responsive semantics and allowlisted tokens.
- Desktop three-pane editor, responsive mobile-web inspector, native sheet-based editor; templates, add/remove/duplicate/reorder, web drag/drop, accessible arrow controls, native long-press selection/reorder, content/style/layout/responsive controls, image uploads, local/native image crop, 50-step history, undo/redo, 800ms draft autosave, local offline recovery and explicit conflict handling.
- Immutable versions, draft backups before layout replacement, atomic publication pointer, version restore, ownership checks and `If-Match` optimistic concurrency.
- Discover/search/category/price/stock filters, favorites/follows, product/variant management, collections, public SSR shop/product/profile routes.
- Separate shop carts, authoritative quotes, transactional row-locked stock reservation, idempotent checkout, timestamped HMAC sandbox webhooks, payment failure/cancel/refund stock reconciliation, order screens and seller fulfillment/tracking.
- Report intake, role-restricted moderator queue and audited shop suspension. Validated/EXIF-stripped WebP image uploads; private draft images; local storage or a server-only Supabase Storage adapter.
- Editable shop details, domestic shipping price and returns policy. Account/profile preferences persist in PostgreSQL.

See [milestone verification](docs/MILESTONES.md), [implementation decisions](docs/decisions/001-architecture.md), [pilot requirements](docs/PILOT_READINESS.md), and [operations](docs/runbooks/operations.md) for actual verification and remaining limits. This is a working local sandbox, **not a declaration that every production launch gate is complete**.

The native app has been smoke-tested on the connected **physical iPhone through iPhone Mirroring**: sign-in/persistence, three-tab navigation, storefront styling/autosave/publish/restore, reorder/undo/redo, product editing, collection order, variant pricing, checkout and refund. Device findings, fixes and untested cases are recorded in [iPhone QA](docs/IPHONE_QA.md). Android QA is deferred.

## Supabase configuration

Copy `.env.example` to `.env` (setup does this locally). Set `AUTH_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and a dedicated PostgreSQL `DATABASE_URL`. For Storage also set the **server-only** service-role key and create a private `shop-assets` bucket. Run migrations with the application/migration owner role. Do not expose the service-role key to web or mobile.

Business data is accessed through FastAPI only. Migration 0003 enables RLS with no client policies and revokes direct access from PUBLIC/anon/authenticated on the app tables. The dedicated server table owner retains access; every private endpoint checks ownership. Use a dedicated project/database rather than running this application’s migrations against an unrelated project.

The Supabase adapter provisions a personal space from a verified JWT on first use. OAuth, provider email delivery, account recovery and provider-side deployment settings still require configuration and testing. `ENVIRONMENT=production` rejects local development auth. Payments remain sandbox-only regardless of environment.

## Native development

```sh
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev:mobile
```

Default API hosts are `127.0.0.1:8000` for iOS Simulator and `10.0.2.2:8000` for Android Emulator. Images use the web host on port 3000. For a real device, provide reachable `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_ASSET_URL`, and bind/forward your development servers appropriately. No secrets belong in `EXPO_PUBLIC_*` variables.

`apps/mobile/eas.json` contains development/preview build profiles. Signed installable builds and store distribution need your own Expo/Apple/Google accounts; export is a bundle check, not an APK/IPA or a device E2E test.

For this Mac's current Wi-Fi session, the phone link is `exp://192.168.0.137:8081`, with API `http://192.168.0.137:8000/api/v1` and assets `http://192.168.0.137:3000`. These addresses may change when Wi-Fi changes. Keep the phone and Mac on the same reachable network. Start the API and web server bound to `0.0.0.0` for local phone access, and start Expo with `--lan`. Allow Expo Go's local network prompt so it can reach this Mac. SDK 57 Expo Go requires sign-in on both devices; run `pnpm --filter @lilac/mobile exec expo login --browser` for the Mac, then sign in to the same account inside Expo Go. No hosted app deployment is required. The ignored `apps/mobile/.env` holds these device-specific addresses.

The mobile client uses Expo **57.0.30**, React Native **0.86.3** and React **19.2.3**, upgraded to match the SDK 57 Expo Go actually installed on the physical iPhone. Native animation/worklet versions are pinned to the Expo SDK compatibility list, including transitive optional peers. The web client keeps its own React version.

## Sample assets

Photos are demonstration imagery downloaded from Unsplash; the source photo IDs and download URLs are in `scripts/download-assets.py`. Shop identities, products, prices and policies are fictional sandbox fixtures. Replace them with authorized real seller content before a pilot. UI fonts are bundled locally from Google Fonts (Bricolage Grotesque, Caprasimo and Caveat, SIL Open Font License; copies of each licence sit next to the web font files). System font fallbacks remain available.
