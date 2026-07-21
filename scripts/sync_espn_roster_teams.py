#!/usr/bin/env python3
"""Sync player teams in the local database against ESPN roster assignments."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
JERSEYS_PATH = ROOT / "data" / "nba-jersey-numbers.json"
OVERRIDES_PATH = ROOT / "data" / "nba-current-teams.json"
ESPN_TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=50"

ESPN_TO_BBR = {
    "ATL": "ATL",
    "BOS": "BOS",
    "BKN": "BRK",
    "CHA": "CHO",
    "CHI": "CHI",
    "CLE": "CLE",
    "DAL": "DAL",
    "DEN": "DEN",
    "DET": "DET",
    "GS": "GSW",
    "HOU": "HOU",
    "IND": "IND",
    "LAC": "LAC",
    "LAL": "LAL",
    "MEM": "MEM",
    "MIA": "MIA",
    "MIL": "MIL",
    "MIN": "MIN",
    "NO": "NOP",
    "NY": "NYK",
    "OKC": "OKC",
    "ORL": "ORL",
    "PHI": "PHI",
    "PHX": "PHO",
    "POR": "POR",
    "SAC": "SAC",
    "SA": "SAS",
    "TOR": "TOR",
    "UTAH": "UTA",
    "WSH": "WAS",
}

SUFFIX_PATTERN = re.compile(r"\b(jr|sr|ii|iii|iv|v)\b", re.I)


def normalize_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(char for char in decomposed if not unicodedata.combining(char))
    stripped = SUFFIX_PATTERN.sub("", stripped)
    stripped = re.sub(r"[^a-zA-Z]", "", stripped)
    return stripped.lower()


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def load_stats_players() -> list[dict]:
    payload = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    return payload["players"]


def build_name_index(players: list[dict]) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}

    for player in players:
        key = normalize_name(str(player["name"]))
        index.setdefault(key, []).append(player)

    return index


def fetch_espn_assignments() -> dict[str, str]:
    teams_payload = fetch_json(ESPN_TEAMS_URL)
    assignments: dict[str, str] = {}

    for entry in teams_payload["sports"][0]["leagues"][0]["teams"]:
        team = entry["team"]
        espn_abbr = str(team["abbreviation"])
        bbr_team = ESPN_TO_BBR.get(espn_abbr, espn_abbr)
        roster_url = (
            f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/"
            f"{team['id']}/roster"
        )
        roster = fetch_json(roster_url)

        for athlete in roster.get("athletes", []):
            name = str(athlete["displayName"])
            assignments[name] = bbr_team

    return assignments


def resolve_player(
    espn_name: str,
    name_index: dict[str, list[dict]],
) -> dict | None:
    matches = name_index.get(normalize_name(espn_name), [])

    if len(matches) == 1:
        return matches[0]

    if len(matches) > 1:
        for candidate in matches:
            if candidate["name"].lower() == espn_name.lower():
                return candidate

    return None


def player_bbr_id(player: dict) -> str:
    if player.get("bbrPlayerId"):
        return str(player["bbrPlayerId"])

    return str(player["id"]).split("-", 1)[0]


def build_overrides(
    players: list[dict],
    espn_assignments: dict[str, str],
) -> tuple[dict[str, str], list[tuple[str, str, str]]]:
    name_index = build_name_index(players)
    overrides: dict[str, str] = {}
    changes: list[tuple[str, str, str]] = []
    seen_bbr: set[str] = set()

    for espn_name, target_team in sorted(espn_assignments.items()):
        player = resolve_player(espn_name, name_index)

        if not player:
            continue

        bbr_id = player_bbr_id(player)

        if bbr_id in seen_bbr:
            continue

        seen_bbr.add(bbr_id)
        current_team = str(player["team"])

        if current_team != target_team:
            overrides[bbr_id] = target_team
            changes.append((str(player["name"]), current_team, target_team))

    return overrides, changes


def apply_team_updates(players: list[dict], overrides: dict[str, str]) -> int:
    updated = 0

    for player in players:
        bbr_id = player_bbr_id(player)
        target_team = overrides.get(bbr_id)

        if not target_team or str(player["team"]) == target_team:
            continue

        # Preserve the team the season stats were earned for.
        if not player.get("statsTeam"):
            player["statsTeam"] = str(player["team"])

        player["team"] = target_team
        player["id"] = f"{bbr_id}-{target_team.lower()}"
        updated += 1

    return updated


def apply_jersey_updates(overrides: dict[str, str]) -> int:
    if not JERSEYS_PATH.exists():
        return 0

    payload = json.loads(JERSEYS_PATH.read_text(encoding="utf-8"))
    updated = 0

    for bbr_id, team in overrides.items():
        entry = payload.get("byPlayerId", {}).get(bbr_id)

        if entry and entry.get("team") != team:
            entry["team"] = team
            updated += 1

        for player in payload.get("players", []):
            if str(player.get("bbrPlayerId")) == bbr_id and player.get("team") != team:
                player["team"] = team
                updated += 1

    if updated:
        payload["generatedAt"] = datetime.now(timezone.utc).isoformat()
        payload["rosterSource"] = "espn"
        JERSEYS_PATH.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    return updated


def write_override_file(overrides: dict[str, str]) -> None:
    existing = {}

    if OVERRIDES_PATH.exists():
        payload = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
        existing = payload.get("overrides", payload)

    merged = {**existing, **overrides}
    OVERRIDES_PATH.write_text(
        json.dumps(
            {
                "description": (
                    "Current NBA team overrides synced from ESPN rosters for players "
                    "traded after the Basketball Reference export window."
                ),
                "source": "espn-roster-api",
                "rosterAsOf": datetime.now(timezone.utc).date().isoformat(),
                "overrides": dict(sorted(merged.items())),
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print changes without writing files.",
    )
    args = parser.parse_args()

    stats_payload = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    players = stats_payload["players"]
    espn_assignments = fetch_espn_assignments()
    overrides, changes = build_overrides(players, espn_assignments)

    print(f"ESPN roster entries: {len(espn_assignments)}")
    print(f"Team changes detected: {len(changes)}")

    for name, old_team, new_team in changes:
        print(f"  {name}: {old_team} -> {new_team}")

    if args.dry_run:
        return 0

    updated_players = apply_team_updates(players, overrides)
    stats_payload["rosterAsOf"] = datetime.now(timezone.utc).date().isoformat()
    stats_payload["rosterSource"] = "espn-roster-api"
    stats_payload["generatedAt"] = datetime.now(timezone.utc).isoformat()
    stats_payload["players"] = players
    STATS_PATH.write_text(
        json.dumps(stats_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    jersey_updates = apply_jersey_updates(overrides)
    write_override_file(overrides)

    print(f"Updated {updated_players} players in {STATS_PATH.name}")
    print(f"Updated {jersey_updates} jersey team entries")
    print(f"Wrote {len(overrides)} overrides to {OVERRIDES_PATH.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
