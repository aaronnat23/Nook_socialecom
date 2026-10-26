# Deploying a preview of Nook

This gets the web app onto a public link so someone else can click through it and review it. It is a **preview**, not a production launch: sign-in is the development mode (anyone with the link can create an account), payments are the sandbox, and every shop and product is fictional.

Nook has two halves, and Vercel only runs one of them:

| Half           | What it is                        | Where it goes                                                                             |
| -------------- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| Web            | Next.js app in `apps/web`         | **Vercel**                                                                                |
| API + database | FastAPI in `apps/api`, PostgreSQL | **Render** (free plan, one click with `render.yaml`) or any host that runs a Docker image |

The web app never talks to the API from the browser directly. It rewrites `/api/*` and `/media/*` to the API's address (`API_URL`), so there is no CORS to configure and the API needs no public hostname in the web bundle.

Do the API first, because Vercel needs its address.

## 1. The API and database on Render

1. Sign in at [render.com](https://render.com) with GitHub and allow it to read this repository.
2. **New → Blueprint**, pick this repository and the branch you want to show, and confirm. Render reads `render.yaml` and creates:
   - `nook-api`, a Docker web service built from `infra/Dockerfile.api` (health check `/health`),
   - `nook-db`, a free PostgreSQL database wired in as `DATABASE_URL`.
3. Wait for the first deploy. On start the container runs the migrations, loads the sample shops and products, and starts the server. The first build takes several minutes.
4. Open `https://<your-service>.onrender.com/health`. You should see `{"status":"ok","database":"postgresql",...}`. Copy that base address (no trailing slash) for the next step.

What the blueprint sets, in case you use another host:

| Variable                 | Value                                     | Why                                                                                                                                                        |
| ------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | the database's connection string          | `postgres://` and `postgresql://` URLs are accepted and rewritten to the psycopg driver                                                                    |
| `ENVIRONMENT`            | `development`                             | the only mode that allows built-in email/password sign-in                                                                                                  |
| `AUTH_MODE`              | `local`                                   | built-in sign-in, no Supabase needed                                                                                                                       |
| `STORAGE_BACKEND`        | `database`                                | keeps uploaded photos in PostgreSQL, because a free web service loses its disk on every restart. Leave it unset (`files`) on a host with a persistent disk |
| `LOCAL_AUTH_SECRET`      | random, generated                         | signs session tokens                                                                                                                                       |
| `SANDBOX_WEBHOOK_SECRET` | random, at least 32 characters, generated | signs the sandbox payment webhooks                                                                                                                         |

Any host works if it can run `infra/Dockerfile.api` (build context: the repository root) and give it a PostgreSQL 15+ database. The container listens on `$PORT` (default 8000).

## 2. The web app on Vercel

1. In Vercel choose **Add New → Project** and import this repository.
2. Set **Root Directory** to `apps/web`. Leave the framework as **Next.js**. Keep "Include source files outside of the Root Directory" switched on, because the web app imports the workspace packages in `packages/`.
3. Add these environment variables (Production, and Preview if you want preview deployments to work too):

   | Variable                       | Value                                                                                                                                                     |
   | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `API_URL`                      | the API address from step 1, for example `https://nook-api.onrender.com`                                                                                  |
   | `NEXT_PUBLIC_SITE_URL`         | the final Vercel address, for example `https://nook.vercel.app` (used for link previews and the sitemap; set it after the first deploy and redeploy once) |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1` (this repository pins pnpm 11 in `package.json`; this makes Vercel use that exact version)                                                            |

4. Deploy.
5. Pick which branch is the live one: **Settings → Git → Production Branch**, or merge the branch into the default branch. Other branches get preview URLs that sit behind Vercel sign-in unless you turn **Settings → Deployment Protection** off, which matters if the person reviewing does not have a Vercel account.

The web build does not call the API, so it succeeds even while the API is asleep.

## 3. Check it

1. Open the Vercel address. Discover should show the sample shops and photos.
2. **My Space → Open your space → Continue as demo shop owner** signs in as the fictional demo seller (`demo@lilac.local`). Open the page editor to try the 14 templates, and add a product with a photo to cut out its background.
3. If Discover is empty or shows an error, open `API_URL/health` directly. A free Render service sleeps after a period without traffic and takes up to a minute to wake, so the first request after a break is slow.

## Things to know before sharing the link

- **Anyone with the link can sign up** and create shops, because this is development authentication. Keep the link between the people reviewing it, use fictional data, and don't enter real payment details (checkout is a sandbox and charges nothing). For anything public, switch to Supabase Auth: set `AUTH_MODE=supabase`, `ENVIRONMENT=production` and the `SUPABASE_*` variables, and see [PILOT_READINESS.md](PILOT_READINESS.md).
- **Free plans have limits.** Render's free web service sleeps when idle, and its free database is time-limited and small. Check Render's current terms, and move to a paid plan or another database such as Neon if the preview needs to live on. Photos stored in the database count toward its size limit.
- **Large uploads.** The first request after a sleep is slow, and Vercel limits request sizes. Keep photos to a few megabytes when trying uploads on the preview.
- **The native app is not part of this.** Reviewers use the web app, which is fully responsive and has the same Discover, My Space and Settings tabs. The Expo app runs from `pnpm dev:mobile` or an EAS build.
- **Resetting the data.** Delete the Render database and redeploy to start over; the sample data is loaded again on start.

## Deploying from the command line instead

```bash
pnpm dlx vercel login
pnpm dlx vercel link          # run at the repository root
```

Then open the new project's **Settings → General** and set **Root Directory** to `apps/web`, add the environment variables from step 2 (`pnpm dlx vercel env add API_URL production`), and run `pnpm dlx vercel deploy --prod` from the repository root.
