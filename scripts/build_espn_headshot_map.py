#!/usr/bin/env python3
"""Build data/espn-player-headshots.json from ESPN NBA roster APIs."""

from __future__ import annotations

import json
import re
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATS_PATH = ROOT / "data/nba-stats/nba-player-stats-202526-regular-season.json"
OUT_PATH = ROOT / "data/espn-player-headshots.json"
TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=50"


def normalize_name(name: str) -> str:
    text = unicodedata.normalize("NFKD", name)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def main() -> None:
    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    players = stats["players"]
    by_norm: dict[str, list[dict]] = {}
    for player in players:
        bbr = player.get("bbrPlayerId")
        if not bbr:
            continue
        for key in {
            normalize_name(player["name"]),
            normalize_name(player.get("canonicalName") or player["name"]),
        }:
            by_norm.setdefault(key, []).append(player)

    with urllib.request.urlopen(TEAMS_URL, timeout=60) as response:
        teams = json.load(response)["sports"][0]["leagues"][0]["teams"]

    mapped: dict[str, dict] = {}
    unmatched: list[dict] = []

    for entry in teams:
        team = entry["team"]
        team_id = team["id"]
        espn_abbr = team["abbreviation"]
        roster_url = (
            "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/"
            f"{team_id}/roster"
        )
        with urllib.request.urlopen(roster_url, timeout=60) as response:
            roster = json.load(response)

        for athlete in roster.get("athletes", []):
            name = athlete.get("displayName") or athlete.get("fullName")
            espn_id = str(athlete["id"])
            headshot = (athlete.get("headshot") or {}).get("href")
            if not headshot:
                headshot = (
                    "https://a.espncdn.com/i/headshots/nba/players/full/"
                    f"{espn_id}.png"
                )

            candidates = by_norm.get(normalize_name(name), [])
            chosen = None
            if len(candidates) == 1:
                chosen = candidates[0]
            elif candidates:
                for candidate in candidates:
                    if candidate["name"].lower() == name.lower():
                        chosen = candidate
                        break
                chosen = chosen or candidates[0]

            if not chosen:
                unmatched.append(
                    {"name": name, "espnId": espn_id, "team": espn_abbr},
                )
                continue

            mapped[chosen["bbrPlayerId"]] = {
                "espnId": espn_id,
                "name": chosen["name"],
                "headshotUrl": headshot,
            }

        time.sleep(0.05)

    payload = {
        "description": (
            "ESPN athlete ids / headshot URLs keyed by Basketball-Reference "
            "player id (current NBA rosters)."
        ),
        "source": "espn-roster-api",
        "generatedAt": datetime.now(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z"),
        "byBbrPlayerId": mapped,
        "unmatchedCount": len(unmatched),
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"mapped={len(mapped)} unmatched={len(unmatched)} -> {OUT_PATH}")


if __name__ == "__main__":
    main()
