#!/usr/bin/env python3
"""Align jersey number team tags with the current player pool."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
JERSEYS_PATH = ROOT / "data" / "nba-jersey-numbers.json"


def main() -> None:
    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    jerseys = json.loads(JERSEYS_PATH.read_text(encoding="utf-8"))
    by_player = jerseys.setdefault("byPlayerId", {})

    team_by_bbr: dict[str, str] = {}
    name_by_bbr: dict[str, str] = {}

    for player in stats.get("players", []):
        bbr = player.get("bbrPlayerId")
        if not bbr:
            continue
        team_by_bbr[bbr] = str(player.get("team") or "")
        name_by_bbr[bbr] = str(player.get("name") or "")

    updated = 0
    added = 0

    for bbr, team in team_by_bbr.items():
        entry = by_player.get(bbr)
        if entry:
            if entry.get("team") != team or entry.get("name") != name_by_bbr.get(bbr):
                entry["team"] = team
                entry["name"] = name_by_bbr[bbr]
                updated += 1
        else:
            by_player[bbr] = {
                "jerseyNumber": 0,
                "team": team,
                "name": name_by_bbr[bbr],
            }
            added += 1

    jerseys["updatedAt"] = datetime.now(timezone.utc).isoformat()
    jerseys["playerCount"] = len(by_player)
    JERSEYS_PATH.write_text(f"{json.dumps(jerseys, indent=2)}\n", encoding="utf-8")

    print(f"Updated jersey team tags: {updated}")
    print(f"Added missing jersey rows: {added}")
    print(f"Total jersey rows: {len(by_player)}")


if __name__ == "__main__":
    main()
