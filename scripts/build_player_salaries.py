#!/usr/bin/env python3
"""Fetch 2026-27 NBA player salaries from Basketball Reference contracts page."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
DEFAULT_OUTPUT_PATH = ROOT / "data" / "nba-salaries-202627.json"
CONTRACTS_URL = "https://www.basketball-reference.com/contracts/players.html"
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NBA-stats-export/1.0; +https://github.com/ballacademy/NBA-head-to-head-)",
}
# 2026-27 NBA minimum salary (0 years experience).
ROOKIE_MINIMUM_SALARY = 1_361_969
SALARY_COLUMN = "y2"


def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z]", "", name.lower())


def fetch_contract_rows(salary_column: str = SALARY_COLUMN) -> list[tuple[str, str, int]]:
    response = requests.get(CONTRACTS_URL, headers=REQUEST_HEADERS, timeout=90)
    response.raise_for_status()
    html = response.text
    rows: list[tuple[str, str, int]] = []

    for row_html in re.findall(r"<tr[^>]*>.*?</tr>", html, re.DOTALL):
        player_match = re.search(r'data-append-csv="([a-z0-9]+)"', row_html)
        salary_match = re.search(
            rf'data-stat="{salary_column}"[^>]*csk="(\d+)"',
            row_html,
        )

        if not player_match or not salary_match:
            continue

        name_match = re.search(
            r'data-stat="player"[^>]*>.*?>([^<]+)</a>',
            row_html,
            re.DOTALL,
        )
        name = name_match.group(1).strip() if name_match else player_match.group(1)
        rows.append((player_match.group(1), name, int(salary_match.group(1))))

    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stats-path", type=Path, default=DEFAULT_STATS_PATH)
    parser.add_argument("--output-path", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--salary-column", default=SALARY_COLUMN)
    args = parser.parse_args()

    rows = fetch_contract_rows(args.salary_column)
    by_bbr = {bbr_id: salary for bbr_id, _, salary in rows}
    by_name = {normalize_name(name): salary for _, name, salary in rows}

    stats = json.loads(args.stats_path.read_text(encoding="utf-8"))
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
        "season": "2026-27",
        "source": CONTRACTS_URL,
        "salaryColumn": args.salary_column,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "matchedFromContracts": matched,
        "minimumSalaryAssigned": minimum_assigned,
        "playerCount": len(salaries),
        "salaries": salaries,
    }
    args.output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        f"Wrote {len(salaries)} salaries to {args.output_path} "
        f"({matched} from contracts, {minimum_assigned} minimum fallback)"
    )


if __name__ == "__main__":
    main()
