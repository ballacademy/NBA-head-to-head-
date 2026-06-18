#!/usr/bin/env python3
"""Fetch 2025-26 NBA player salaries from Basketball Reference contracts page."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
OUTPUT_PATH = ROOT / "data" / "nba-salaries-202526.json"
CONTRACTS_URL = "https://www.basketball-reference.com/contracts/players.html"
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NBA-stats-export/1.0; +https://github.com/ballacademy/NBA-head-to-head-)",
}
# 2025-26 NBA minimum salary (0 years experience).
ROOKIE_MINIMUM_SALARY = 1_209_240


def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z]", "", name.lower())


def fetch_contract_rows() -> list[tuple[str, str, int]]:
    response = requests.get(CONTRACTS_URL, headers=REQUEST_HEADERS, timeout=90)
    response.raise_for_status()
    pattern = re.compile(
        r'data-stat="player"[^>]*>.*?/players/[a-z]/([a-z0-9]+)\.html[^>]*>([^<]+)</a>.*?'
        r'data-stat="y1"[^>]*csk="(\d+)"',
        re.DOTALL,
    )
    return [(bbr_id, name.strip(), int(salary)) for bbr_id, name, salary in pattern.findall(response.text)]


def main() -> None:
    rows = fetch_contract_rows()
    by_bbr = {bbr_id: salary for bbr_id, _, salary in rows}
    by_name = {normalize_name(name): salary for _, name, salary in rows}

    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    pool = [player for player in stats["players"] if player.get("gamesPlayed", 0) > 0]

    salaries: dict[str, int] = {}
    matched = 0
    minimum_assigned = 0

    for player in pool:
        bbr_id = player.get("bbrPlayerId")
        key = bbr_id or player["id"]

        if bbr_id and bbr_id in by_bbr:
            salaries[key] = by_bbr[bbr_id]
            matched += 1
            continue

        normalized = normalize_name(player["name"])
        if normalized in by_name:
            salaries[key] = by_name[normalized]
            matched += 1
            continue

        salaries[key] = ROOKIE_MINIMUM_SALARY
        minimum_assigned += 1

    payload = {
        "season": "2025-26",
        "source": CONTRACTS_URL,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "matchedFromContracts": matched,
        "minimumSalaryAssigned": minimum_assigned,
        "playerCount": len(salaries),
        "salaries": salaries,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        f"Wrote {len(salaries)} salaries to {OUTPUT_PATH} "
        f"({matched} from contracts, {minimum_assigned} minimum fallback)"
    )


if __name__ == "__main__":
    main()
