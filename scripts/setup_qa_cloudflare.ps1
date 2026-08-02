# One-time Cloudflare QA bootstrap (Pages project + D1).
# Requires: wrangler login, or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in the environment.
# Usage (PowerShell, from repo root):
#   .\scripts\setup_qa_cloudflare.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> Creating Pages project nba-head-to-head-qa (production branch: qa)"
$npx = if (Test-Path "C:\Program Files\nodejs\npx.cmd") {
  "C:\Program Files\nodejs\npx.cmd"
} else {
  "npx.cmd"
}

try {
  & $npx wrangler pages project create nba-head-to-head-qa --production-branch qa
} catch {
  Write-Host "(project may already exist — continuing)"
}

Write-Host ""
Write-Host "==> Creating D1 database draft-day-gm-qa"
Write-Host "    Copy the database_id from the output into GitHub secret QA_D1_DATABASE_ID"
Write-Host "    (or paste it into wrangler.qa.toml)."
Write-Host ""
& $npx wrangler d1 create draft-day-gm-qa

Write-Host ""
Write-Host "Next:"
Write-Host "  1. Set GitHub Actions secret QA_D1_DATABASE_ID (or edit wrangler.qa.toml)"
Write-Host "  2. npx wrangler d1 migrations apply draft-day-gm-qa --remote -c wrangler.qa.toml"
Write-Host "  3. git checkout -b qa; git push -u origin qa"
Write-Host "See DEPLOY-CLOUDFLARE.md → QA / non-production environment."
