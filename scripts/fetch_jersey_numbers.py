#!/usr/bin/env python3
"""Fetch current NBA jersey numbers from Basketball Reference team rosters."""

from __future__ import annotations

import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

DEFAULT_SEASON = "2025-26"
DEFAULT_OUTPUT = (
    Path(__file__).resolve().parent.parent / "data" / "nba-jersey-numbers.json"
)
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NBA-stats-export/1.0; +https://github.com/ballacademy/NBA-head-to-head-)",
    "Accept-Language": "en-US,en;q=0.9",
}

NBA_TEAMS = [
    "ATL",
    "BOS",
    "BRK",
    "CHI",
    "CHO",
    "CLE",
    "DAL",
    "DEN",
    "DET",
    "GSW",
    "HOU",
    "IND",
    "LAC",
    "LAL",
    "MEM",
    "MIA",
    "MIL",
    "MIN",
    "NOP",
    "NYK",
    "OKC",
    "ORL",
    "PHI",
    "PHO",
    "POR",
    "SAC",
    "SAS",
    "TOR",
    "UTA",
    "WAS",
]

ROW_PATTERN = re.compile(
    r'data-stat="number"[^>]*>(\d{1,2})</th>.*?'
    r"/players/[a-z]/([^.'\"]+)\.html['\"]>([^<]+)</a>.*?"
    r'data-stat="pos"[^>]*>\s*([A-Z]{1,2})\s*<',
    re.S,
)
ROW_BLOCK_PATTERN = re.compile(r"<tr\b.*?</tr>", re.S)


def parse_roster_html(html: str, team: str) -> list[dict[str, str | int]]:
    players: list[dict[str, str | int]] = []

    for row in ROW_BLOCK_PATTERN.findall(html):
        if 'data-stat="player"' not in row or 'scope="col"' in row:
            continue

        match = ROW_PATTERN.search(row)
        if not match:
            continue

        number, bbr_player_id, name, position = match.groups()
        players.append(
            {
                "bbrPlayerId": bbr_player_id,
                "name": name,
                "team": team,
                "jerseyNumber": int(number),
                "position": position,
            }
        )

    return players


def season_end_year(season: str) -> int:
    start_year, end_suffix = season.split("-")
    return int(start_year[:2] + end_suffix)


def fetch_team_roster_numbers(team: str, season: str) -> list[dict[str, str | int]]:
    year = season_end_year(season)
    url = f"https://www.basketball-reference.com/teams/{team}/{year}.html"
    response = requests.get(url, headers=REQUEST_HEADERS, timeout=30)
    response.raise_for_status()
    return parse_roster_html(response.text, team)


def build_payload(season: str, delay_seconds: float = 3.0) -> dict:
    by_player_id: dict[str, dict[str, str | int]] = {}
    players: list[dict[str, str | int]] = []

    for index, team in enumerate(NBA_TEAMS):
        roster = fetch_team_roster_numbers(team, season)
        players.extend(roster)

        for player in roster:
            by_player_id[str(player["bbrPlayerId"])] = {
                "jerseyNumber": player["jerseyNumber"],
                "team": player["team"],
            }

        if index < len(NBA_TEAMS) - 1:
            time.sleep(delay_seconds)

    return {
        "season": season,
        "source": "basketball-reference",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(by_player_id),
        "byPlayerId": by_player_id,
        "players": players,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", default=DEFAULT_SEASON)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--delay-seconds", type=float, default=3.0)
    args = parser.parse_args()

    payload = build_payload(args.season, args.delay_seconds)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {payload['playerCount']} jersey numbers to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
