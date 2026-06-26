#!/usr/bin/env python3
"""Build career All-Star lists and best-season snapshots for All-Time draft mode."""

from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
STATS_PATH = DATA_DIR / "nba-stats" / "nba-player-stats-202526-regular-season.json"
CAREER_PATH = DATA_DIR / "all-stars-career-active.json"
BEST_SEASONS_PATH = DATA_DIR / "active-star-best-seasons.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NBA-stats-export/1.0; +https://github.com/ballacademy/NBA-head-to-head-)",
}


def load_current_players() -> dict[str, dict]:
    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    return {
        player["bbrPlayerId"]: player
        for player in stats["players"]
        if player.get("bbrPlayerId")
    }


def load_team_overrides() -> dict[str, str]:
    path = DATA_DIR / "nba-current-teams.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {str(key): str(value) for key, value in payload.get("overrides", payload).items()}


def fetch_career_active_all_stars(current_bbr: set[str]) -> set[str]:
    all_star_ids: set[str] = set()

    for year in range(2005, 2027):
        url = f"https://www.basketball-reference.com/allstar/NBA_{year}.html"
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        ids = set(re.findall(r'/players/[a-z]/([^"]+)\.html', response.text))
        all_star_ids |= ids & current_bbr
        time.sleep(1.2)

    for path in (DATA_DIR / "all-stars-2026.json", DATA_DIR / "all-stars-recent.json"):
        payload = json.loads(path.read_text(encoding="utf-8"))
        all_star_ids |= set(payload["bbrPlayerIds"])

    return all_star_ids


def fetch_best_season_row(bbr_id: str) -> dict | None:
    letter = bbr_id[0]
    url = f"https://www.basketball-reference.com/players/{letter}/{bbr_id}.html"
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()

    for table in pd.read_html(StringIO(response.text)):
        columns = [str(column) for column in table.columns]
        if "Season" in columns and "PTS" in columns and "MP" in columns:
            per_game = table
            break
    else:
        return None

    per_game.columns = [str(column) for column in per_game.columns]
    rows = per_game[
        ~per_game["Season"].astype(str).str.contains("Career|Did Not Play|SEASON", na=False)
    ].copy()
    rows = rows[rows["Season"].notna()]
    rows = rows[~rows["Season"].astype(str).str.endswith("PS")]
    rows["PTS"] = pd.to_numeric(rows["PTS"], errors="coerce")
    rows["MP"] = pd.to_numeric(rows["MP"], errors="coerce")
    rows["G"] = pd.to_numeric(rows["G"], errors="coerce")
    rows = rows[rows["G"] >= 20]

    if rows.empty:
        return None

    return rows.sort_values(["PTS", "MP"], ascending=[False, False]).iloc[0].to_dict()


def row_to_best_season_payload(
    bbr_id: str,
    current_player: dict,
    best_row: dict,
    team_overrides: dict[str, str],
) -> dict:
    team = team_overrides.get(bbr_id, str(best_row.get("Tm", current_player["team"])))
    fga = float(best_row.get("FGA", 0) or 0)
    fta = float(best_row.get("FTA", 0) or 0)
    points = float(best_row.get("PTS", 0) or 0)
    true_shooting = None

    if fga + 0.44 * fta > 0:
        true_shooting = round(points / (2 * (fga + 0.44 * fta)), 3)

    return {
        "bbrPlayerId": bbr_id,
        "name": current_player["name"],
        "team": team,
        "bestSeason": str(best_row.get("Season", "")),
        "position": current_player.get("position"),
        "positions": current_player.get("positions"),
        "age": int(float(best_row["Age"])) if pd.notna(best_row.get("Age")) else current_player.get("age"),
        "gamesPlayed": int(float(best_row.get("G", 0) or 0)),
        "gamesStarted": int(float(best_row.get("GS", 0) or 0)) if pd.notna(best_row.get("GS")) else 0,
        "minutes": float(best_row.get("MP", 0) or 0),
        "points": points,
        "rebounds": float(best_row.get("TRB", 0) or 0),
        "assists": float(best_row.get("AST", 0) or 0),
        "steals": float(best_row.get("STL", 0) or 0),
        "blocks": float(best_row.get("BLK", 0) or 0),
        "turnovers": float(best_row.get("TOV", 0) or 0),
        "fieldGoalsAttempted": fga,
        "threePointersAttempted": float(best_row.get("3PA", 0) or 0),
        "threePointPct": float(best_row.get("3P%", 0) or 0) if pd.notna(best_row.get("3P%")) else 0.0,
        "trueShooting": true_shooting,
    }


def main() -> int:
    current_by_bbr = load_current_players()
    team_overrides = load_team_overrides()

    print("Fetching career All-Star selections for active players...")
    career_ids = fetch_career_active_all_stars(set(current_by_bbr))
    career_payload = {
        "description": "Current NBA players who have ever been selected to an NBA All-Star Game",
        "bbrPlayerIds": sorted(career_ids),
    }
    CAREER_PATH.write_text(json.dumps(career_payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(career_ids)} career active All-Stars to {CAREER_PATH}")

    best_season_players: list[dict] = []
    for index, bbr_id in enumerate(sorted(career_ids), start=1):
        current_player = current_by_bbr.get(bbr_id)
        if not current_player:
            continue

        best_row = fetch_best_season_row(bbr_id)
        time.sleep(1.2)

        if not best_row:
            print(f"  skipped {bbr_id}: no qualifying season")
            continue

        best_season_players.append(
            row_to_best_season_payload(bbr_id, current_player, best_row, team_overrides),
        )

        if index % 10 == 0:
            print(f"  processed {index}/{len(career_ids)}")

    best_season_payload = {
        "description": "Best regular-season statistical snapshot for each active career All-Star",
        "selectionCriteria": "Highest points per game (minimum 20 games), ties broken by minutes",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(best_season_players),
        "players": sorted(best_season_players, key=lambda player: (-player["points"], player["name"])),
    }
    BEST_SEASONS_PATH.write_text(json.dumps(best_season_payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(best_season_players)} best-season snapshots to {BEST_SEASONS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
