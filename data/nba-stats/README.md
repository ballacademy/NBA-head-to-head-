# NBA Player Stats Export

Traditional NBA player statistics fetched from [Basketball Reference](https://www.basketball-reference.com/).

## Generate the files

From the repo root:

```bash
python3 -m pip install -r scripts/requirements.txt
# Current season (player-facing stats + limited-sample blend input)
python3 scripts/fetch_nba_player_stats.py --season 2026-27
# Prior season (DEF/usage spine + prior-season-production.json)
python3 scripts/fetch_nba_player_stats.py --season 2025-26
python3 scripts/build_prior_season_production.py \
  --input data/nba-stats/nba-player-stats-202526-regular-season.json
```

On Windows PowerShell:

```powershell
python -m pip install -r scripts/requirements.txt
python scripts/fetch_nba_player_stats.py --season 2026-27
python scripts/fetch_nba_player_stats.py --season 2025-26
```

Optional flags:

```bash
# Playoff stats
python3 scripts/fetch_nba_player_stats.py --season 2026-27 --season-type "Playoffs"

# Custom output folder
python3 scripts/fetch_nba_player_stats.py --output-dir ./exports
```

## Output files

After a successful run, this folder contains season-tagged exports such as:

| File | Use case |
|------|----------|
| `nba-player-stats-202627-regular-season-per-game.csv` | Current-season per-game averages |
| `nba-player-stats-202627-regular-season.json` | Current-season web/app pool (display) |
| `nba-player-stats-202526-regular-season.json` | Prior-season spine + blend partner |
| `nba-player-stats-*-regular-season.xlsx` | Excel / Google Sheets |

The CSV and JSON files include every stat row from Basketball Reference, including separate rows for traded players and combined `2TM`/`TOT` lines. The app shows **2026-27** stats when a player has games, and game-weights scoring against **2025-26** until the current sample reaches 30 games.

## Manual / compliant refresh (no scraping)

If you are maintaining data without hitting Basketball Reference directly, use:

```bash
python3 scripts/csv_to_stats_json.py \
  --input data/nba-stats/nba-player-stats-202526-regular-season-per-game.csv \
  --advanced-csv data/nba-stats/nba-player-stats-202526-regular-season-advanced.csv \
  --season 2025-26
```

Or curate a smaller CSV from `data/manual/player-stats-template.csv`. See `data/manual/README.md`.

## JSON shape (for apps)

```json
{
  "season": "2025-26",
  "seasonType": "Regular Season",
  "source": "basketball-reference",
  "generatedAt": "2026-06-15T12:00:00+00:00",
  "playerCount": 570,
  "players": [
    {
      "id": "luka-doncic",
      "bbrPlayerId": "doncilu01",
      "name": "Luka Dončić",
      "team": "LAL",
      "position": "PG",
      "points": 33.5,
      "rebounds": 7.7,
      "assists": 8.3,
      "trueShooting": 0.612
    }
  ]
}
```

## Traditional stat columns (CSV)

Per-game CSV columns:

`PLAYER_NAME`, `BBR_PLAYER_ID`, `TEAM_ABBREVIATION`, `POSITION`, `AGE`, `GP`, `GS`, `MIN`, `FGM`, `FGA`, `FG_PCT`, `FG3M`, `FG3A`, `FG3_PCT`, `FTM`, `FTA`, `FT_PCT`, `OREB`, `DREB`, `REB`, `AST`, `STL`, `BLK`, `TOV`, `PF`, `PTS`, `EFG_PCT`
