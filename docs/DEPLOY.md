# Deploying a preview of Nook

This puts Nook on a public link so someone else can click through it and review it. It is a **preview**, not a production launch: sign-in is the development mode (anyone with the link can create an account), payments are the sandbox, and every shop and product is fictional.

Nook has two halves that talk to each other:

| Half           | What it is                        | Where it can go                                                                                          |
| -------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Web            | Next.js app in `apps/web`         | **Vercel**                                                                                               |
| API + database | FastAPI in `apps/api`, PostgreSQL | **Vercel** too (a Python function plus a Postgres from the Vercel Marketplace), or **Render**, or Docker |

The web app never calls the API from the browser directly. It rewrites `/api/*` and `/media/*` to the API's address (`API_URL`), so there is no CORS to configure.

## Option A: everything on Vercel (two projects and a database)

Create two Vercel projects from the same repository and branch.

### 1. `nook-api` (the FastAPI backend)

| Setting                    | Value                                    |
| -------------------------- | ---------------------------------------- |
| Root Directory             | `apps/api`                               |
| Framework preset           | FastAPI                                  |
| Production branch / source | the branch you want to show              |
| Vercel Authentication      | **off** (the web project calls this one) |

`apps/api/vercel.json` pins the install command to `uv sync --frozen` and `apps/api/pyproject.toml` lists the dependencies. That matters: this is a Turborepo, and without the override Vercel runs `pnpm install` for the Python project and the function starts without any packages.

Environment variables (Production and Preview):

| Variable                 | Value                                      | Why                                                                                                     |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | added for you by the database (next step)  | `postgres://` and `postgresql://` URLs are accepted and rewritten to the psycopg driver                 |
| `ENVIRONMENT`            | `development`                              | the only mode that allows built-in email/password sign-in                                               |
| `AUTH_MODE`              | `local`                                    | built-in sign-in, no Supabase needed                                                                    |
| `STORAGE_BACKEND`        | `database`                                 | a function has no persistent disk, so uploaded photos are kept in PostgreSQL                            |
| `AUTO_MIGRATE`           | `true`                                     | on start, migrate an empty database and load the sample shops once (there is no release step on Vercel) |
| `LOCAL_AUTH_SECRET`      | random string, mark it sensitive           | signs session tokens                                                                                    |
| `SANDBOX_WEBHOOK_SECRET` | random string of 32+ characters, sensitive | signs the sandbox payment webhooks                                                                      |

### 2. The database

In the `nook-api` project open **Storage → Create Database** and pick a Postgres provider from the Marketplace (Neon has a free plan). Connect it to the project for Production and Preview so it adds `DATABASE_URL`. Then redeploy `nook-api`: the first request migrates the database and loads the sample catalog.

Check `https://<nook-api-domain>/health`. You should see `{"status":"ok","database":"postgresql",...}`.

### 3. `nook-web` (the Next.js app)

| Setting               | Value                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| Root Directory        | `apps/web` (keep "Include source files outside of the Root Directory" on) |
| Framework preset      | Next.js                                                                   |
| Vercel Authentication | **off**, if the reviewer does not have a Vercel account                   |

Environment variables (Production and Preview):

| Variable                       | Value                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `API_URL`                      | the `nook-api` address, for example `https://nook-api.vercel.app`, with no trailing slash            |
| `NEXT_PUBLIC_SITE_URL`         | the web address, for example `https://nook-web.vercel.app` (link previews and the sitemap; optional) |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` (this repository pins pnpm 11 in `package.json`; this makes Vercel use that exact version)       |

The web build does not call the API, so it succeeds even while the API has no database yet.

`API_URL` is read at build time (the `/api` and `/media` rewrites are baked into the build), so changing it needs a redeploy. `turbo.json` lists `API_URL` and `NEXT_PUBLIC_SITE_URL` under the build task's `env`; without that, Turborepo hides them from `next build` and the rewrites point at `127.0.0.1`, which shows up as `DNS_HOSTNAME_RESOLVED_PRIVATE` on every browser call to `/api`.

## Option B: the API and database on Render

`render.yaml` is a blueprint for the API and a free PostgreSQL database. In Render choose **New → Blueprint**, pick this repository and branch, and confirm. It builds `infra/Dockerfile.api` (which migrates, loads the sample catalog and starts the server on `$PORT`) and wires `DATABASE_URL`, `STORAGE_BACKEND=database` and generated secrets. Use the service's address as `API_URL` for the Vercel web project above.

Any host that can run `infra/Dockerfile.api` (build context: the repository root) with a PostgreSQL 15+ database works the same way.

## Check it

1. Open the web address. Discover should show the sample shops and photos.
2. **My Space → Open your space → Continue as demo shop owner** signs in as the fictional demo seller (`demo@lilac.local`). Open the page editor to try the 14 templates, and add a product with a photo to cut out its background.
3. If Discover shows an error, open `API_URL/health` directly. The first request after the API has been idle is slower, because the function starts cold and imports the image libraries.

## Things to know before sharing the link

- **Anyone with the link can sign up** and create shops, because this is development authentication, and with Vercel Authentication off anyone can open the API too. Keep the link between the people reviewing it, use fictional data, and don't enter real payment details (checkout is a sandbox and charges nothing). For anything public, switch to Supabase Auth: set `AUTH_MODE=supabase`, `ENVIRONMENT=production` and the `SUPABASE_*` variables, and see [PILOT_READINESS.md](PILOT_READINESS.md).
- **Free plans have limits.** Photos stored in the database count toward its size limit, Render's free service sleeps when idle, and Vercel limits request sizes (about 4.5 MB for a function), so keep photos small when trying uploads. Background removal runs the bundled model on the function's CPU and can be slow on the first call.
- **Preview deployments and production.** Pushes to a connected branch create new deployments. Set the Production Branch in **Settings → Git** to the branch you want on the main address.
- **The native app is not part of this.** Reviewers use the web app, which is fully responsive and has the same Discover, My Space and Settings tabs. The Expo app runs from `pnpm dev:mobile` or an EAS build.
- **Vercel handles some request headers itself.** It consumes `If-Match` at its edge (an unquoted revision gets a 412, a quoted one never reaches the API), so the draft revision travels in the request body (`baseRevision`) instead. Avoid putting application preconditions in conditional headers on this host.
- **Resetting the data.** Empty the database (drop its tables, or delete and recreate it) and redeploy; the sample data is loaded again on start.
