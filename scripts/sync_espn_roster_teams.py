#!/usr/bin/env python3
"""Sync player teams + jersey numbers against ESPN roster assignments."""

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

# Confirmed moves not yet on ESPN team rosters (buyout / waiver timing).
# Map ESPN display name → BBR team abbreviation.
MANUAL_TEAM_OVERRIDES = {
    "Klay Thompson": "MIA",
}


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


def parse_jersey(raw: object) -> int | None:
    if raw is None or raw == "":
        return None
    try:
        return int(str(raw).strip())
    except ValueError:
        return None


def fetch_espn_roster_rows() -> list[dict[str, object]]:
    teams_payload = fetch_json(ESPN_TEAMS_URL)
    rows: list[dict[str, object]] = []

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
            rows.append(
                {
                    "name": name,
                    "team": bbr_team,
                    "jerseyNumber": parse_jersey(athlete.get("jersey")),
                }
            )

    for name, team in MANUAL_TEAM_OVERRIDES.items():
        if not any(normalize_name(str(row["name"])) == normalize_name(name) for row in rows):
            rows.append({"name": name, "team": team, "jerseyNumber": None})

    return rows


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
    espn_rows: list[dict[str, object]],
) -> tuple[dict[str, str], dict[str, int], list[tuple[str, str, str]], list[tuple[str, int | None, int]]]:
    name_index = build_name_index(players)
    overrides: dict[str, str] = {}
    jersey_by_bbr: dict[str, int] = {}
    team_changes: list[tuple[str, str, str]] = []
    jersey_changes: list[tuple[str, int | None, int]] = []
    seen_bbr: set[str] = set()

    for row in sorted(espn_rows, key=lambda item: str(item["name"])):
        espn_name = str(row["name"])
        target_team = str(row["team"])
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
            team_changes.append((str(player["name"]), current_team, target_team))

        jersey_number = row.get("jerseyNumber")
        if isinstance(jersey_number, int):
            jersey_by_bbr[bbr_id] = jersey_number

    return overrides, jersey_by_bbr, team_changes, jersey_changes


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


def apply_jersey_updates(
    team_overrides: dict[str, str],
    jersey_by_bbr: dict[str, int],
    name_by_bbr: dict[str, str],
    current_team_by_bbr: dict[str, str],
) -> tuple[int, list[tuple[str, int | None, int]]]:
    if not JERSEYS_PATH.exists():
        return 0, []

    payload = json.loads(JERSEYS_PATH.read_text(encoding="utf-8"))
    by_player = payload.setdefault("byPlayerId", {})
    players_list = payload.setdefault("players", [])
    updated = 0
    jersey_changes: list[tuple[str, int | None, int]] = []

    # Ensure every pool player has a jersey row tagged to the current team.
    for bbr_id, team in current_team_by_bbr.items():
        name = name_by_bbr.get(bbr_id, bbr_id)
        entry = by_player.get(bbr_id)
        if entry is None:
            by_player[bbr_id] = {
                "jerseyNumber": jersey_by_bbr.get(bbr_id, 0),
                "team": team,
                "name": name,
            }
            updated += 1
            continue

        changed = False
        if entry.get("team") != team:
            entry["team"] = team
            changed = True
        if entry.get("name") != name:
            entry["name"] = name
            changed = True
        if bbr_id in jersey_by_bbr and entry.get("jerseyNumber") != jersey_by_bbr[bbr_id]:
            jersey_changes.append(
                (name, entry.get("jerseyNumber"), jersey_by_bbr[bbr_id]),
            )
            entry["jerseyNumber"] = jersey_by_bbr[bbr_id]
            changed = True
        if changed:
            updated += 1

    # Keep legacy players[] array in sync when present.
    for player in players_list:
        bbr_id = str(player.get("bbrPlayerId") or "")
        if not bbr_id:
            continue
        entry = by_player.get(bbr_id)
        if not entry:
            continue
        player["team"] = entry.get("team", player.get("team"))
        player["name"] = entry.get("name", player.get("name"))
        if "jerseyNumber" in entry:
            player["jerseyNumber"] = entry["jerseyNumber"]

    payload["generatedAt"] = datetime.now(timezone.utc).isoformat()
    payload["updatedAt"] = payload["generatedAt"]
    payload["rosterSource"] = "espn"
    payload["playerCount"] = len(by_player)
    JERSEYS_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    return updated, jersey_changes


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
    espn_rows = fetch_espn_roster_rows()
    overrides, jersey_by_bbr, team_changes, _ = build_overrides(players, espn_rows)

    print(f"ESPN roster entries: {len(espn_rows)}")
    print(f"Team changes detected: {len(team_changes)}")

    for name, old_team, new_team in team_changes:
        print(f"  {name}: {old_team} -> {new_team}")

    # Preview jersey number changes against current file.
    existing_jerseys = {}
    if JERSEYS_PATH.exists():
        existing_jerseys = (
            json.loads(JERSEYS_PATH.read_text(encoding="utf-8")).get("byPlayerId") or {}
        )
    jersey_previews: list[tuple[str, int | None, int]] = []
    for bbr_id, number in jersey_by_bbr.items():
        prior = existing_jerseys.get(bbr_id, {}).get("jerseyNumber")
        if prior != number:
            name = next(
                (str(player["name"]) for player in players if player_bbr_id(player) == bbr_id),
                bbr_id,
            )
            jersey_previews.append((name, prior, number))

    print(f"Jersey number changes detected: {len(jersey_previews)}")
    for name, old_number, new_number in jersey_previews[:40]:
        print(f"  {name}: #{old_number} -> #{new_number}")
    if len(jersey_previews) > 40:
        print(f"  … and {len(jersey_previews) - 40} more")

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

    name_by_bbr = {player_bbr_id(player): str(player["name"]) for player in players}
    current_team_by_bbr = {
        player_bbr_id(player): str(player["team"]) for player in players
    }
    jersey_updates, jersey_changes = apply_jersey_updates(
        overrides,
        jersey_by_bbr,
        name_by_bbr,
        current_team_by_bbr,
    )
    write_override_file(overrides)

    print(f"Updated {updated_players} players in {STATS_PATH.name}")
    print(f"Updated {jersey_updates} jersey entries ({len(jersey_changes)} number changes)")
    print(f"Wrote {len(overrides)} overrides to {OVERRIDES_PATH.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
