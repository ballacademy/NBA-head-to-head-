# Deploy to Cloudflare Pages

This app is a static Vite build (`dist/`). Cloudflare Pages serves the files globally with no backend required for the current game features.

## One-time setup

### 1. Create a Cloudflare Pages project

1. Sign in at [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git** is optional — this repo uses **Direct Upload via GitHub Actions** instead
3. Or create an empty project from the CLI (optional):

```bash
npx wrangler pages project create nba-head-to-head --production-branch main
```

The GitHub Action uses project name **`nba-head-to-head`**. Change the name in `.github/workflows/deploy-cloudflare-pages.yml` if you prefer another.

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

`GITHUB_TOKEN` is provided automatically for deployment status on pull requests.

### 5. Merge feature work into `main`

The deploy workflow runs on pushes to **`main`**. Merge your open PRs (game modes, bugfixes, rankings, etc.) before expecting the live site to match local dev.

To deploy a branch manually without merging: **Actions** → **Deploy to Cloudflare Pages** → **Run workflow** → choose the branch.

## What happens on deploy

1. `npm ci`
2. `npm test`
3. `npm run build` → `dist/`
4. `wrangler pages deploy dist --project-name=nba-head-to-head`

- Pushes to **`main`** update the **production** URL
- Other branches (manual workflow runs) create **preview** deployments

## Local production preview

```bash
npm run build
npx wrangler pages dev dist
```

## Custom domain (optional)

1. Cloudflare dashboard → **Workers & Pages** → **nba-head-to-head** → **Custom domains**
2. Add your domain (e.g. `draft.ballacademy.com`)
3. Follow DNS instructions (Cloudflare can manage DNS if the domain is on your account)

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
- **`public/_redirects`** sends unknown paths to `index.html` for safe refreshes on deep links.
- **Node 22** is used in CI (see `.nvmrc`).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Deploy fails: missing secrets | Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub |
| Project not found | Create the Pages project or match `project-name` in the workflow |
| Site shows old scaffold | Merge latest branches into `main` and redeploy |
| Build fails in CI | Run `npm test` and `npm run build` locally first |
