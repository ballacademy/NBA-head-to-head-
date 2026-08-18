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
