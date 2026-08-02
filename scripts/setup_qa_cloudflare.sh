#!/usr/bin/env bash
# One-time Cloudflare QA bootstrap (Pages project + D1).
# Requires: npx wrangler auth (wrangler login) or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Creating Pages project nba-head-to-head-qa (production branch: qa)"
npx wrangler pages project create nba-head-to-head-qa --production-branch qa \
  || echo "(project may already exist — continuing)"

echo
echo "==> Creating D1 database draft-day-gm-qa"
echo "    Copy the database_id from the output into GitHub secret QA_D1_DATABASE_ID"
echo "    (or paste it into wrangler.qa.toml)."
echo
npx wrangler d1 create draft-day-gm-qa

echo
echo "Next:"
echo "  1. Set GitHub Actions secret QA_D1_DATABASE_ID (or edit wrangler.qa.toml)"
echo "  2. npx wrangler d1 migrations apply draft-day-gm-qa --remote -c wrangler.qa.toml"
echo "  3. git checkout -b qa && git push -u origin qa"
echo "See DEPLOY-CLOUDFLARE.md → QA / non-production environment."
