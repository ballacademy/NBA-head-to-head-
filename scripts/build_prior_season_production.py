#!/usr/bin/env python3
"""Build data/prior-season-production.json from a fetched season stats JSON."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data" / "prior-season-production.json"


def build_players(season_payload: dict) -> dict[str, dict]:
    best: dict[str, dict] = {}
    for row in season_payload.get("players", []):
        bbr = row.get("bbrPlayerId")
        if not bbr:
            continue
        games = row.get("gamesPlayed") or 0
        previous = best.get(bbr)
        if previous is None or games > previous["gamesPlayed"]:
            best[bbr] = row

    players: dict[str, dict] = {}
    for bbr, row in sorted(best.items()):
        players[bbr] = {
            "gamesPlayed": row["gamesPlayed"],
            "points": round(float(row["points"]), 1),
            "rebounds": round(float(row["rebounds"]), 1),
            "assists": round(float(row["assists"]), 1),
            "steals": round(float(row.get("steals") or 0), 1),
            "blocks": round(float(row.get("blocks") or 0), 1),
            "turnovers": round(float(row.get("turnovers") or 0), 1),
            "minutes": round(float(row["minutes"]), 1),
            "trueShooting": round(float(row.get("trueShooting") or 0.54), 3),
            "threePoint": round(float(row.get("threePointPct") or 0), 3),
            "threePointersAttempted": round(
                float(row.get("threePointersAttempted") or 0), 1
            ),
            "fieldGoalsAttempted": round(float(row.get("fieldGoalsAttempted") or 0), 1),
            "freeThrowsAttempted": round(float(row.get("freeThrowsAttempted") or 0), 1),
            "freeThrowPct": round(float(row.get("freeThrowPct") or 0), 3),
            "personalFouls": round(float(row.get("personalFouls") or 0), 1),
        }
    return players


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build prior-season-production.json for limited-sample blending."
    )
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Fetched season JSON from scripts/fetch_nba_player_stats.py",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output path (default: {DEFAULT_OUTPUT})",
    )
    args = parser.parse_args()

    season_payload = json.loads(args.input.read_text(encoding="utf-8"))
    players = build_players(season_payload)
    payload = {
        "description": (
            "Prior-season production used to game-weight blend limited "
            "current-season samples for scoring."
        ),
        "season": season_payload.get("season"),
        "seasonType": season_payload.get("seasonType"),
        "source": season_payload.get("source", "basketball-reference"),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(players),
        "players": players,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output} ({len(players)} players)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
