# NBA Player Stats Export

Traditional NBA player statistics fetched from [Basketball Reference](https://www.basketball-reference.com/).

## Generate the files

From the repo root:

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/fetch_nba_player_stats.py --season 2025-26
```

On Windows PowerShell:

```powershell
python -m pip install -r scripts/requirements.txt
python scripts/fetch_nba_player_stats.py --season 2025-26
```

Optional flags:

```bash
# Playoff stats
python3 scripts/fetch_nba_player_stats.py --season 2025-26 --season-type "Playoffs"

# Custom output folder
python3 scripts/fetch_nba_player_stats.py --output-dir ./exports
```

## Output files

After a successful run, this folder contains:

| File | Use case |
|------|----------|
| `nba-player-stats-202526-regular-season-per-game.csv` | Spreadsheet / data pipelines (per-game averages) |
| `nba-player-stats-202526-regular-season-totals.csv` | Season totals |
| `nba-player-stats-202526-regular-season.json` | Web apps and APIs |
| `nba-player-stats-202526-regular-season.xlsx` | Excel / Google Sheets (Per Game, Totals, Per Player, Metadata sheets) |

The CSV and JSON files include every stat row from Basketball Reference, including separate rows for traded players and combined `2TM`/`TOT` lines. The JSON currently has **733 rows** across **582 unique players**.

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
