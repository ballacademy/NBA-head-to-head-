#!/usr/bin/env python3
"""Attach 2025-26 Basketball-Reference PPG to ESPN ids for the player picker."""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
HEADSHOTS_PATH = ROOT / "data" / "espn-player-headshots.json"
PLAYERS_PATH = ROOT / "data" / "nba-active-tier-players.json"
OUT_PATH = ROOT / "data" / "nba-active-tier-player-scoring.json"
SOURCE_URL = "https://www.basketball-reference.com/leagues/NBA_2026_per_game.html"
SUFFIX_PATTERN = re.compile(r"\b(jr|sr|ii|iii|iv|v)\b", re.I)


def normalize_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(char for char in decomposed if not unicodedata.combining(char))
    stripped = SUFFIX_PATTERN.sub("", stripped)
    return re.sub(r"[^a-z0-9]+", "", stripped.lower())


def main() -> None:
    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    headshots = json.loads(HEADSHOTS_PATH.read_text(encoding="utf-8"))
    roster = json.loads(PLAYERS_PATH.read_text(encoding="utf-8"))

    bbr_to_espn = {
        str(bbr): str((entry or {}).get("espnId") or "")
        for bbr, entry in (headshots.get("byBbrPlayerId") or {}).items()
    }
    espn_names = {
        normalize_name(str(player.get("name") or "")): str(player.get("id") or "")
        for player in roster.get("players") or []
    }

    by_espn: dict[str, float] = {}
    mapped = 0
    named = 0
    for row in stats.get("players") or []:
        ppg = row.get("points")
        if not isinstance(ppg, (int, float)):
            continue
        value = round(float(ppg), 1)
        espn_id = bbr_to_espn.get(str(row.get("bbrPlayerId") or ""))
        if espn_id:
            by_espn[espn_id] = max(value, by_espn.get(espn_id, 0))
            mapped += 1
            continue
        fallback = espn_names.get(normalize_name(str(row.get("name") or "")))
        if fallback:
            by_espn[fallback] = max(value, by_espn.get(fallback, 0))
            named += 1

    payload = {
        "description": (
            "2025-26 NBA regular-season points per game for the player-tier picker. "
            "Matched to ESPN athlete ids via data/espn-player-headshots.json."
        ),
        "season": stats.get("season") or "2025-26",
        "seasonType": stats.get("seasonType") or "Regular Season",
        "source": SOURCE_URL,
        "sourceFile": "data/nba-stats/nba-player-stats-202526-regular-season.json",
        "metric": "pointsPerGame",
        "matched": len(by_espn),
        "mappedFromBbr": mapped,
        "mappedFromName": named,
        "byEspnId": dict(sorted(by_espn.items(), key=lambda item: (-item[1], item[0]))),
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {len(by_espn)} PPG rows "
        f"(bbr map {mapped}, name {named}) -> {OUT_PATH}"
    )


if __name__ == "__main__":
    main()
