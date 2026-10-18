# Local and staging operations

## Health and API contract

`GET /health` checks a real PostgreSQL query and reports auth/payment mode. `/docs` contains interactive OpenAPI. `pnpm api:generate` regenerates the checked-in TS OpenAPI declaration from the running API. Public pages are server-rendered and require the API for real catalog content.

## Database

`pnpm db:migrate` applies versioned Alembic migrations. Migrations never call the seed script automatically except the explicit Docker development command. `pnpm db:seed` is idempotent, adds only fictional sandbox content and does not erase existing records.

Use a dedicated PostgreSQL database and server role. Never reuse a browser Supabase key as a SQL credential. All API money fields are minor units; do not edit totals manually.

For local backup: `pg_dump -h 127.0.0.1 -p 55432 -U lilac_app -Fc lilac > backup.dump`. Store backups outside the public web directory. Restore only into a disposable database to test a restore drill. Back up Storage objects separately.

## Reservation expiry

Run `cd apps/api && ../../.venv/bin/python -m app.worker` once per minute in staging. It claims at most 100 pending expired orders using `FOR UPDATE SKIP LOCKED`. Guarded transactional transitions ensure inventory is returned once. Payment completion re-checks expiration even before the worker runs.

## Identity

Local auth is for development only. Argon2 hashes and session revocation records are stored in PostgreSQL. Supabase token verification restricts issuer, audience, algorithm, signature and expiration. Log out calls the server to revoke a local/provider session before dropping client credentials. Never log Authorization headers or refresh tokens.

## Reports

A profile’s `is_admin` is never writable through the profile API. Provision a moderator using a controlled administrative database process. `/admin` and `/api/v1/admin/*` require that distinct role; shop suspension is audited. No default moderator is provisioned with a public password.

## Uploads

Only JPG/PNG/WebP magic bytes, at most 10 MB / 6000×6000 pixels; WebP re-encoding strips metadata. Uploaded assets are bound to their owner/shop. Private images are fetched through an authorized API, not an unauthenticated URL. Public access requires a product or current published document reference. Supabase Storage remains private; server-only authenticated reads fill the local cache.

## Test records

The Python suite checks the `_test` suffix before truncation. Browser tests operate on the sample demo shop and leave immutable publication/order audit records; refund sandbox orders to restore stock. Never point browser tests at a real seller or live payment service.

## Current verification limits

See `docs/MILESTONES.md` for commands, observed results, evidence and deviations. Container, hosted Supabase, cloud CI, signed mobile distribution and real payment compliance are separate gates.
