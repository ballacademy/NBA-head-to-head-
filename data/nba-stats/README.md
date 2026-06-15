# NBA Player Stats Export

Traditional NBA player statistics fetched from the official NBA Stats API via [`nba_api`](https://github.com/swar/nba_api).

## Generate the files

From the repo root, on a **local machine** (NBA.com blocks most cloud/VPN/datacenter IPs):

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/fetch_nba_player_stats.py --season 2025-26
```

Optional flags:

```bash
# Playoff stats
python3 scripts/fetch_nba_player_stats.py --season 2025-26 --season-type "Playoffs"

# Custom output folder
python3 scripts/fetch_nba_player_stats.py --output-dir ./exports

# If requests time out, try a proxy
python3 scripts/fetch_nba_player_stats.py --proxy "http://user:pass@host:port"
```

You can also trigger the GitHub Actions workflow **Fetch NBA Player Stats** manually from the Actions tab. If that run times out, run the script locally instead.

## Output files

After a successful run, this folder contains:

| File | Use case |
|------|----------|
| `nba-player-stats-202526-regular-season-per-game.csv` | Spreadsheet / data pipelines (per-game averages) |
| `nba-player-stats-202526-regular-season-totals.csv` | Season totals |
| `nba-player-stats-202526-regular-season.json` | Web apps and APIs |
| `nba-player-stats-202526-regular-season.xlsx` | Excel / Google Sheets (Per Game, Totals, Metadata sheets) |

## JSON shape (for apps)

```json
{
  "season": "2025-26",
  "seasonType": "Regular Season",
  "generatedAt": "2026-06-15T12:00:00+00:00",
  "playerCount": 450,
  "players": [
    {
      "id": "nikola-jokic",
      "playerId": 203999,
      "name": "Nikola Jokic",
      "team": "DEN",
      "points": 26.4,
      "rebounds": 12.4,
      "assists": 9.0,
      "steals": 1.4,
      "blocks": 0.9,
      "trueShooting": 0.65
    }
  ]
}
```

Each player entry includes traditional counting and shooting stats (per game), plus computed `trueShooting`.

## Traditional stat columns (CSV)

Per-game CSV columns match NBA.com traditional stats:

`PLAYER_ID`, `PLAYER_NAME`, `TEAM_ID`, `TEAM_ABBREVIATION`, `AGE`, `GP`, `W`, `L`, `W_PCT`, `MIN`, `FGM`, `FGA`, `FG_PCT`, `FG3M`, `FG3A`, `FG3_PCT`, `FTM`, `FTA`, `FT_PCT`, `OREB`, `DREB`, `REB`, `AST`, `TOV`, `STL`, `BLK`, `BLKA`, `PF`, `PFD`, `PTS`, `PLUS_MINUS`, `NBA_FANTASY_PTS`, `DD2`, `TD3`
