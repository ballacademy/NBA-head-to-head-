# Deploy to Cloudflare Pages

This app is a Vite SPA (`dist/`) hosted on Cloudflare Pages. Online features (matchmaking, leaderboards, accounts, Daily Draft scores) use **Pages Functions** plus a **D1** database binding named `DB`. See `BACKEND-MATCHMAKING.md` for API + migration details.

## One-time setup

### 1. Create a Cloudflare Pages project

1. Sign in at [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git** is optional — this repo uses **Direct Upload via GitHub Actions** instead
3. Or create an empty project from the CLI (optional):

```bash
npx wrangler pages project create nba-head-to-head --production-branch main
```

The GitHub Action uses project name **`nba-head-to-head`** for production. QA uses **`nba-head-to-head-qa`** (see below). Change the names in the workflow files if you prefer others.

### 2. Get your Account ID

In the Cloudflare dashboard: **Workers & Pages** → right sidebar **Account ID**.

### 3. Create an API token

1. **My Profile** → **API Tokens** → **Create Token**
2. Use template **Edit Cloudflare Workers** or create a custom token with:
   - **Account** → **Cloudflare Pages** → **Edit**
3. Copy the token (shown once)

### 4. Add GitHub repository secrets

In GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Value |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | Token from step 3 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from step 2 |
| `QA_D1_DATABASE_ID` | (QA only) UUID from `wrangler d1 create draft-day-gm-qa` |

`GITHUB_TOKEN` is provided automatically for deployment status on pull requests.

### 5. Merge feature work into `main`

The **production** deploy workflow runs on pushes to **`main`**. Merge your open PRs before expecting the live site to match local dev.

To deploy production manually: **Actions** → **Deploy to Cloudflare Pages** → **Run workflow** → choose the branch (usually `main`).

## What happens on production deploy

1. `npm ci`
2. `npm test`
3. `npm run build` → `dist/`
4. `wrangler pages deploy dist --project-name=nba-head-to-head`

- Pushes to **`main`** update the **production** URL (`www.draftdaygm.com`)
- Manual runs of the production workflow from other branches create **preview** deployments on the same project (still potentially bound to prod D1 — prefer the QA project below for non-prod API work)

## QA / non-production environment

Use a **separate** Pages project + D1 database so accounts, leaderboards, Daily Draft scores, and matchmaking never touch production.

| | Production | QA |
|--|------------|-----|
| Git branch | `main` | `qa` |
| Pages project | `nba-head-to-head` | `nba-head-to-head-qa` |
| Wrangler config | `wrangler.toml` | `wrangler.qa.toml` |
| D1 database | `draft-day-gm` | `draft-day-gm-qa` |
| Workflow | `deploy-cloudflare-pages.yml` | `deploy-cloudflare-pages-qa.yml` |

### One-time QA setup

From a machine with `wrangler` logged in (or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` set):

```bash
# 1) Pages project (production branch = qa)
npx wrangler pages project create nba-head-to-head-qa --production-branch qa

# 2) Separate D1 database
npx wrangler d1 create draft-day-gm-qa
```

Copy the printed `database_id` into GitHub → **Settings** → **Secrets and variables** → **Actions** as secret **`QA_D1_DATABASE_ID`** (recommended), *or* paste it into `wrangler.qa.toml` replacing `REPLACE_WITH_QA_D1_DATABASE_ID`.

Then apply migrations once (also runs automatically on each QA deploy):

```bash
# If the id is only in the GitHub secret, paste it into wrangler.qa.toml locally first.
npx wrangler d1 migrations apply draft-day-gm-qa --remote -c wrangler.qa.toml
```

In the Cloudflare dashboard → **Workers & Pages** → **nba-head-to-head-qa** → **Settings** → **Functions**, confirm D1 binding name **`DB`** → `draft-day-gm-qa` (Production).

Optional custom domain: add `qa.draftdaygm.com` on the QA Pages project.

### Create / update the `qa` branch

```bash
git checkout main
git pull
git checkout -b qa   # first time only; afterwards: git checkout qa && git merge main
git push -u origin qa
```

Pushes to **`qa`** run **Deploy QA to Cloudflare Pages** (test → build → apply QA migrations → deploy). Manual: **Actions** → **Deploy QA to Cloudflare Pages** → **Run workflow**.

### Local QA API

```bash
npm run build
npx wrangler pages dev dist -c wrangler.qa.toml
```

## Local production preview

```bash
npm run build
npx wrangler pages dev dist
```

## Custom domain (optional)

1. Cloudflare dashboard → **Workers & Pages** → **nba-head-to-head** → **Custom domains**
2. Add **both**:
   - `www.draftdaygm.com`
   - `draftdaygm.com` (apex)
3. Confirm DNS for the zone includes Cloudflare’s apex target (Pages usually adds this when you attach the apex custom domain). Bare `draftdaygm.com` must resolve — if `dig draftdaygm.com A` returns nothing, Safari will show “couldn’t connect to the server” even though `www` works.
4. Prefer **www** as the public URL. `functions/_middleware.ts` 301-redirects `draftdaygm.com` → `www.draftdaygm.com` once the apex is reachable.

### Apex not opening on mobile Safari

Symptom: `https://www.draftdaygm.com` works, but `draftdaygm.com` / `https://draftdaygm.com` fails with “Safari can’t open the page because it couldn’t connect to the server.”

Cause: the apex hostname has no A/AAAA records (only `www` is published). App redirects cannot run until DNS answers for the apex.

Fix in Cloudflare DNS / Pages:

1. Pages → **Custom domains** → add `draftdaygm.com` if missing
2. DNS → ensure apex (`draftdaygm.com`) has the proxied record Cloudflare creates for Pages (not only `www`)
3. Wait for propagation, then verify:
   - `dig draftdaygm.com A` returns Cloudflare IPs
   - `https://draftdaygm.com` redirects to `https://www.draftdaygm.com`

## Manual deploy from your machine

```bash
npm run build
npx wrangler pages deploy dist --project-name=nba-head-to-head
```

Requires `wrangler login` or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in the environment.

## Notes

- **Collection progress and unlocks** are stored in each visitor’s browser (`localStorage`).
- **Daily Draft scores** sync to D1 via `/api/daily-scores` so percentiles reflect all players. Local storage still caches your lineup for offline viewing.
- **Classic and Pro leaderboards** sync to D1 via `/api/leaderboards` so rankings reflect real front offices globally. Local storage remains an offline fallback.
- **Head-to-head ghost lineups** use D1 (`/api/lineups`, `/api/opponent`, etc.).
- **`public/_redirects`** intentionally has no `/* → index.html` catch-all. Cloudflare Pages already SPA-falls back when there is no top-level `404.html`. A catch-all also rewrote missing `/assets/*` hashes to HTML (`200 text/html`), which browsers refuse as CSS/JS and shows as a white unstyled page.
- **`public/assets/404.html`** makes missing hashed bundles return a real 404 instead of the app shell.
- **`public/_headers`** keeps `index.html` non-cacheable and long-caches only hashed `.js`/`.css` files.
- **Node 22** is used in CI (see `.nvmrc`).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Deploy fails: missing secrets | Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub |
| Project not found | Create the Pages project or match `project-name` in the workflow |
| Site shows old scaffold | Merge latest branches into `main` and redeploy |
| White page / black unstyled text after a deploy | Hard refresh. Confirm `/assets/missing.css` returns **404**, not `200 text/html`. Keep `public/assets/404.html` and do not restore `/* /index.html 200`. |
| Build fails in CI | Run `npm test` and `npm run build` locally first |
