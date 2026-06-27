#!/usr/bin/env python3
"""Fetch 2026-27 NBA player salaries from Basketball Reference and Spotrac options."""

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
DEFAULT_OPTION_TEAMS_PATH = ROOT / "data" / "nba-option-team-overrides-202627.json"
CONTRACTS_URL = "https://www.basketball-reference.com/contracts/players.html"
OPTIONS_URL = "https://www.spotrac.com/nba/option/_/year/2026"
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NBA-stats-export/1.0; +https://github.com/ballacademy/NBA-head-to-head-)",
}
SALARY_COLUMN = "y2"

SPOTRAC_TEAM_MAP = {
    "BKN": "BRK",
    "CHA": "CHO",
    "PHX": "PHO",
}

ACTIVE_OPTION_TYPES = {
    "player",
    "team",
    "player-exercised",
    "team-exercised",
}


def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z]", "", name.lower())


def normalize_team(team: str) -> str:
    return SPOTRAC_TEAM_MAP.get(team, team)


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


def parse_option_type(option_html: str) -> str:
    if "option-player-declined" in option_html:
        return "player-declined"
    if "option-club-declined" in option_html:
        return "team-declined"
    if "option-player-exercised" in option_html:
        return "player-exercised"
    if "option-club-exercised" in option_html:
        return "team-exercised"
    if "option-player" in option_html:
        return "player"
    if "option-club" in option_html:
        return "team"
    return "unknown"


def fetch_option_rows() -> list[dict[str, object]]:
    response = requests.get(OPTIONS_URL, headers=REQUEST_HEADERS, timeout=90)
    response.raise_for_status()
    html = response.text
    rows: list[dict[str, object]] = []

    for row_html in re.findall(r"<tr[^>]*>.*?</tr>", html, re.DOTALL):
        name_match = re.search(
            r'/nba/player/_/id/\d+/[^"]+" class="link">([^<]+)</a>',
            row_html,
        )
        if not name_match:
            continue

        cells = re.findall(r"<td[^>]*>(.*?)</td>", row_html, re.DOTALL)
        if len(cells) < 6:
            continue

        team = normalize_team(re.sub(r"<[^>]+>", "", cells[2]).strip())
        option_html = cells[4]
        salary_text = re.sub(r"<[^>]+>", "", cells[5]).strip()
        salary_digits = re.sub(r"[^0-9]", "", salary_text)
        if not salary_digits:
            continue

        option_type = parse_option_type(option_html)
        if option_type not in ACTIVE_OPTION_TYPES:
            continue

        rows.append(
            {
                "name": name_match.group(1).strip(),
                "team": team,
                "salary": int(salary_digits),
                "optionType": option_type,
            }
        )

    return rows


def build_player_lookup(
    pool: list[dict[str, object]],
) -> dict[str, list[dict[str, object]]]:
    lookup: dict[str, list[dict[str, object]]] = {}
    for player in pool:
        lookup.setdefault(normalize_name(str(player["name"])), []).append(player)
    return lookup


def match_option_player(
    option: dict[str, object],
    lookup: dict[str, list[dict[str, object]]],
) -> dict[str, object] | None:
    candidates = lookup.get(normalize_name(str(option["name"])), [])
    if not candidates:
        return None

    if len(candidates) == 1:
        return candidates[0]

    team = str(option["team"])
    team_matches = [
        player
        for player in candidates
        if player.get("team") == team or player.get("team") == "2TM"
    ]
    if len(team_matches) == 1:
        return team_matches[0]

    return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stats-path", type=Path, default=DEFAULT_STATS_PATH)
    parser.add_argument("--output-path", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument(
        "--option-teams-path",
        type=Path,
        default=DEFAULT_OPTION_TEAMS_PATH,
    )
    parser.add_argument("--salary-column", default=SALARY_COLUMN)
    args = parser.parse_args()

    rows = fetch_contract_rows(args.salary_column)
    by_bbr = {bbr_id: salary for bbr_id, _, salary in rows}
    by_name = {normalize_name(name): salary for _, name, salary in rows}

    stats = json.loads(args.stats_path.read_text(encoding="utf-8"))
    pool = [player for player in stats["players"] if player.get("gamesPlayed", 0) > 0]
    lookup = build_player_lookup(pool)

    salaries: dict[str, int] = {}
    matched_contracts = 0
    unmatched = 0

    for player in pool:
        bbr_id = player.get("bbrPlayerId")
        key = bbr_id or player["id"]

        if bbr_id and bbr_id in by_bbr:
            salaries[key] = by_bbr[bbr_id]
            matched_contracts += 1
            continue

        normalized = normalize_name(str(player["name"]))
        if normalized in by_name:
            salaries[key] = by_name[normalized]
            matched_contracts += 1
            continue

        unmatched += 1

    option_rows = fetch_option_rows()
    option_team_overrides: dict[str, str] = {}
    matched_options = 0
    skipped_options = 0

    for option in option_rows:
        player = match_option_player(option, lookup)
        if not player:
            skipped_options += 1
            continue

        bbr_id = player.get("bbrPlayerId")
        if not bbr_id:
            skipped_options += 1
            continue

        key = str(bbr_id)
        if key not in salaries:
            salaries[key] = int(option["salary"])
            matched_options += 1

        option_team_overrides[key] = str(option["team"])

    option_teams_payload = {
        "season": "2026-27",
        "source": OPTIONS_URL,
        "description": (
            "Teams for 2026-27 player/team options, assuming the option is exercised."
        ),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(option_team_overrides),
        "overrides": option_team_overrides,
    }
    args.option_teams_path.write_text(
        json.dumps(option_teams_payload, indent=2),
        encoding="utf-8",
    )

    payload = {
        "season": "2026-27",
        "source": CONTRACTS_URL,
        "optionSource": OPTIONS_URL,
        "salaryColumn": args.salary_column,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "matchedFromContracts": matched_contracts,
        "matchedFromOptions": matched_options,
        "skippedOptions": skipped_options,
        "unmatchedPlayers": unmatched,
        "playerCount": len(salaries),
        "salaries": salaries,
    }
    args.output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        f"Wrote {len(salaries)} salaries to {args.output_path} "
        f"({matched_contracts} contracts, {matched_options} options, "
        f"{unmatched} still without a 2026-27 salary)"
    )
    print(
        f"Wrote {len(option_team_overrides)} option team overrides to "
        f"{args.option_teams_path}"
    )


if __name__ == "__main__":
    main()
