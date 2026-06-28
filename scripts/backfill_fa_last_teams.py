#!/usr/bin/env python3
"""Backfill lastTeam on free-agent rows in the season stats JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
PER_GAME_PATH = (
    ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season-per-game.csv"
)
FREE_AGENT_TEAM = "FA"
MULTI_TEAM_LABELS = {"TOT", "2TM", "3TM", FREE_AGENT_TEAM}

# Players added to the unsigned pool without a 2025-26 per-game row.
MANUAL_LAST_TEAM_OVERRIDES: dict[str, str] = {
    "beaslma01": "DET",
    "walkelo01": "CHA",
    "niangge01": "ATL",
    "rosste01": "ORL",
    "burksal01": "MIA",
    "bolbo01": "PHO",
    "smithde03": "BRK",
    "simmobe01": "LAC",
    "jacksre01": "PHI",
    "craigto01": "BOS",
    "richajo01": "MIA",
    "millspa02": "UTA",
    "reddica01": "LAL",
    "wrighde01": "MIL",
    "crowdja01": "MIL",
    "porteot01": "TOR",
    "thomptr01": "CLE",
}


def load_last_team_lookup(per_game_path: Path) -> dict[str, str]:
    per_game = pd.read_csv(per_game_path)
    lookup: dict[str, str] = {}

    for bbr, group in per_game.groupby("BBR_PLAYER_ID"):
        team_rows = [
            str(team)
            for team in group["TEAM_ABBREVIATION"]
            if str(team) not in MULTI_TEAM_LABELS
        ]
        if team_rows:
            lookup[str(bbr)] = team_rows[-1]

    lookup.update(MANUAL_LAST_TEAM_OVERRIDES)
    return lookup


def backfill_last_teams(
    stats_path: Path = STATS_PATH,
    per_game_path: Path = PER_GAME_PATH,
) -> tuple[int, int]:
    payload = json.loads(stats_path.read_text(encoding="utf-8"))
    lookup = load_last_team_lookup(per_game_path)
    updated = 0
    missing: list[str] = []

    for player in payload.get("players", []):
        if player.get("team") != FREE_AGENT_TEAM:
            if "lastTeam" in player:
                del player["lastTeam"]
            continue

        bbr = str(player.get("bbrPlayerId") or "")
        last_team = lookup.get(bbr)
        if not last_team:
            missing.append(str(player.get("name") or bbr))
            player.pop("lastTeam", None)
            continue

        player["lastTeam"] = last_team
        updated += 1

    stats_path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")
    return updated, len(missing)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stats-path", type=Path, default=STATS_PATH)
    parser.add_argument("--per-game-path", type=Path, default=PER_GAME_PATH)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    updated, missing = backfill_last_teams(args.stats_path, args.per_game_path)
    print(f"Set lastTeam on {updated} free agents.")
    if missing:
        print(f"Missing lastTeam for {len(missing)} players: {', '.join(missing)}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
