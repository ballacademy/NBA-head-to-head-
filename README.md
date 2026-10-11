# Draft Day GM

An NBA-themed web app for drafting five-man lineups and playing head-to-head
matchups: Casual H2H, Pro H2H (salary cap + Banners), Daily Draft, Weekly
Events, and private friend matches.

Lineups are scored on:

- points, rebounds, assists, steals, and blocks
- true shooting percentage
- a three-point shooting bonus
- team fit, including spacing, role balance, defense, rim protection, and
  penalties for too many ball-dominant players

The app can export a shareable lineup image from match and Daily results.

## Instagram composers

On this branch the composer hub **is the home page**. Compose-only Instagram graphics (no posting). Switch **Standings** vs **Tier list** in the top tabs.

```bash
npm run dev
```

Then open [http://localhost:5173/](http://localhost:5173/) for standings (`/?hub=rankings` and `/rankings` also work). The tier list is at [http://localhost:5173/tier-list](http://localhost:5173/tier-list) (`?composer=tier` also works).

- **Standings:** click a grey slot to pick a team, edit the three header lines, export a 4:5 PNG (2400×3000).
- **Tier list:** 3–10 labeled rows (default S–F). Toggle **Teams** vs **Players**. Teams use NBA logos; players use ESPN headshots from the current 30-team rosters (`data/nba-active-tier-players.json`, CDN `a.espncdn.com/i/headshots/nba/...`). Search the player picker by name or team.

Logos are vendored ESPN 500px marks — see `public/nba-logos/README.md`. Player headshots load on demand from ESPN’s public CDN (metadata is vendored so the picker does not scrape live).

Draft Day GM remains at `/?hub=play` if you need the game.

## Scripts

```bash
npm run dev
npm run build
npm test
```

## Cloudflare Pages

See [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md) for one-time Cloudflare + GitHub Actions setup. Production deploys run on push to `main`.

## Windows quick start

Use one folder name every time:

`Downloads\current-nba-head-to-head-folder`

See [SETUP-WINDOWS.md](SETUP-WINDOWS.md) for clone, run, and update steps.

## NBA player stats export

To compile traditional stats for every NBA player (for use in another site or spreadsheet), run the Python fetch script:

```bash
python3 scripts/fetch_nba_player_stats.py
```

See script `--help` for season and output options.
