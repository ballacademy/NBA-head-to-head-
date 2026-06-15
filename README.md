# NBA Head-to-Head Draft

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

## NBA player stats export

To compile traditional stats for every NBA player (for use in another site or spreadsheet), run the Python fetch script locally:

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/fetch_nba_player_stats.py --season 2025-26
```

This writes CSV, JSON, and Excel files to `data/nba-stats/`. See `data/nba-stats/README.md` for file formats and usage.

> **Note:** NBA.com often blocks cloud/datacenter IPs. If the script times out in CI or a remote environment, run it on your laptop and commit the generated files, or use the manual GitHub Actions workflow.
