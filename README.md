# Draft Day GM

An NBA-themed web app where eight global challengers draft five-man lineups,
face one opponent at a time, and advance through a winner-take-all bracket.

Lineups are scored on:

- points, rebounds, assists, steals, and blocks
- true shooting percentage
- a three-point shooting bonus
- team fit, including spacing, role balance, defense, rim protection, and
  penalties for too many ball-dominant players

The app also renders a shareable story-style graphic for each selected lineup.

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
python3 -m pip install -r scripts/requirements.txt
python3 scripts/fetch_nba_player_stats.py --season 2025-26
```

On Windows:

```powershell
python -m pip install -r scripts/requirements.txt
python scripts/fetch_nba_player_stats.py --season 2025-26
```

This pulls data from Basketball Reference and writes CSV, JSON, and Excel files to `data/nba-stats/`. See `data/nba-stats/README.md` for file formats and usage.

For a compliant refresh workflow that does not scrape Basketball Reference, see `data/manual/README.md` and use `scripts/csv_to_stats_json.py` plus `scripts/csv_to_salaries_json.py`.
