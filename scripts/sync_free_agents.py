#!/usr/bin/env python3
"""Tag unsigned NBA players as FA, add missing free agents, and dedupe the pool."""

from __future__ import annotations

import json
import re
import unicodedata
import urllib.request
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
SALARIES_PATH = ROOT / "data" / "nba-salaries-202627.json"
JERSEYS_PATH = ROOT / "data" / "nba-jersey-numbers.json"
OVERRIDES_PATH = ROOT / "data" / "nba-current-teams.json"
FREE_AGENT_TEAM = "FA"

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

CANONICAL_NAMES: dict[str, str] = {
    "hollaro01": "Ronald Holland II",
    "scotttr01": "Trevon Scott",
    "demineg01": "Egor Demin",
}

# New free agents to add (BBR id -> source season JSON for stats)
NEW_FREE_AGENT_BBRS = [
    "simmobe01",
    "reddica01",
    "beaslma01",
    "millspa02",
    "niangge01",
    "crowdja01",
    "walkelo01",
    "smithde03",
    "bolbo01",
    "porteot01",
    "burksal01",
    "wrighde01",
    "craigto01",
    "thomptr01",
    "richajo01",
    "jacksre01",
    "rosste01",
]

SOURCE_SEASON_FILES = [
  ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json",
  Path("/tmp/nba2425/nba-player-stats-202425-regular-season.json"),
  Path("/tmp/nba2324/nba-player-stats-202324-regular-season.json"),
  Path("/tmp/nba2223/nba-player-stats-202223-regular-season.json"),
]

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


def fetch_espn_roster_norms() -> set[str]:
    teams_payload = fetch_json(ESPN_TEAMS_URL)
    norms: set[str] = set()

    for entry in teams_payload["sports"][0]["leagues"][0]["teams"]:
        team = entry["team"]
        roster_url = (
            f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/"
            f"{team['id']}/roster"
        )
        roster = fetch_json(roster_url)
        for athlete in roster.get("athletes", []):
            norms.add(normalize_name(str(athlete["displayName"])))

    return norms


def load_source_players() -> dict[str, dict]:
    by_bbr: dict[str, dict] = {}
    for path in SOURCE_SEASON_FILES:
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        for player in payload.get("players", []):
            bbr = player.get("bbrPlayerId")
            if bbr and bbr not in by_bbr:
                by_bbr[bbr] = deepcopy(player)
    return by_bbr


def player_on_espn_roster(player: dict, espn_norms: set[str]) -> bool:
    name = str(player["name"])
    norm = normalize_name(name)
    if norm in espn_norms:
        return True

    canonical = CANONICAL_NAMES.get(str(player.get("bbrPlayerId") or ""))
    if canonical and normalize_name(canonical) in espn_norms:
        return True

    return False


def to_fa_player(player: dict) -> dict:
    updated = deepcopy(player)
    bbr = str(updated.get("bbrPlayerId") or updated["id"].split("-")[0])
    current_team = str(updated.get("team") or "")
    if current_team and current_team != FREE_AGENT_TEAM:
        updated["lastTeam"] = current_team
    updated["team"] = FREE_AGENT_TEAM
    updated["id"] = f"{bbr}-{FREE_AGENT_TEAM.lower()}"
    if bbr in CANONICAL_NAMES:
        updated["name"] = CANONICAL_NAMES[bbr]
    return updated


def dedupe_by_bbr(players: list[dict]) -> list[dict]:
    best_by_bbr: dict[str, dict] = {}

    for player in players:
        bbr = str(player.get("bbrPlayerId") or "")
        if not bbr:
            continue

        existing = best_by_bbr.get(bbr)
        if not existing:
            best_by_bbr[bbr] = player
            continue

        # Prefer FA row when one duplicate is unsigned.
        if player.get("team") == FREE_AGENT_TEAM and existing.get("team") != FREE_AGENT_TEAM:
            best_by_bbr[bbr] = player
            continue
        if existing.get("team") == FREE_AGENT_TEAM and player.get("team") != FREE_AGENT_TEAM:
            continue

        # Otherwise keep higher minutes season.
        if float(player.get("minutes") or 0) > float(existing.get("minutes") or 0):
            best_by_bbr[bbr] = player

    # Preserve any non-bbr rows (shouldn't exist)
    without_bbr = [p for p in players if not p.get("bbrPlayerId")]
    merged = list(best_by_bbr.values()) + without_bbr
    merged.sort(
        key=lambda row: (
            -float(row.get("points") or 0),
            str(row.get("name") or ""),
        )
    )
    return merged


def main() -> None:
    stats_payload = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    salaries_payload = json.loads(SALARIES_PATH.read_text(encoding="utf-8"))
    jerseys_payload = json.loads(JERSEYS_PATH.read_text(encoding="utf-8"))
    overrides_payload = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))

    espn_norms = fetch_espn_roster_norms()
    source_by_bbr = load_source_players()
    players = stats_payload["players"]

    retagged: list[str] = []
    for index, player in enumerate(players):
        if int(player.get("gamesPlayed") or 0) <= 0:
            continue
        if player.get("team") == FREE_AGENT_TEAM:
            continue
        if player_on_espn_roster(player, espn_norms):
            continue

        updated = to_fa_player(player)
        players[index] = updated
        retagged.append(str(updated["name"]))

    existing_bbrs = {str(p.get("bbrPlayerId")) for p in players if p.get("bbrPlayerId")}
    added: list[str] = []

    for bbr in NEW_FREE_AGENT_BBRS:
        if bbr in existing_bbrs:
            continue
        source = source_by_bbr.get(bbr)
        if not source:
            print(f"Warning: no source stats for {bbr}")
            continue
        fa_player = to_fa_player(source)
        players.append(fa_player)
        existing_bbrs.add(bbr)
        added.append(str(fa_player["name"]))

        salary = salaries_payload.get("salaries", {}).get(bbr)
        if salary is None and bbr in source_by_bbr:
            pass

    players = dedupe_by_bbr(players)

    # Apply canonical names on remaining roster players too
    for player in players:
        bbr = str(player.get("bbrPlayerId") or "")
        if bbr in CANONICAL_NAMES:
            player["name"] = CANONICAL_NAMES[bbr]

    fa_bbrs = {
        str(p.get("bbrPlayerId"))
        for p in players
        if p.get("team") == FREE_AGENT_TEAM and p.get("bbrPlayerId")
    }

    overrides = overrides_payload.get("overrides", {})
    for bbr in list(overrides.keys()):
        if bbr in fa_bbrs:
            del overrides[bbr]

    for bbr in fa_bbrs:
        player = next(p for p in players if p.get("bbrPlayerId") == bbr)
        jerseys_payload.setdefault("byPlayerId", {})[bbr] = {
            "jerseyNumber": jerseys_payload.get("byPlayerId", {}).get(bbr, {}).get(
                "jerseyNumber", 0
            ),
            "team": FREE_AGENT_TEAM,
            "name": player["name"],
        }

    stats_payload["players"] = players
    stats_payload["playerCount"] = len(players)
    stats_payload["uniquePlayerCount"] = len(players)
    stats_payload["freeAgentCount"] = len(fa_bbrs)
    stats_payload["freeAgentSyncedAt"] = datetime.now(timezone.utc).isoformat()

    overrides_payload["overrides"] = overrides
    overrides_payload["updatedAt"] = datetime.now(timezone.utc).isoformat()
    salaries_payload["playerCount"] = len(salaries_payload.get("salaries", {}))
    jerseys_payload["playerCount"] = len(jerseys_payload.get("byPlayerId", {}))

    STATS_PATH.write_text(f"{json.dumps(stats_payload, indent=2)}\n", encoding="utf-8")
    OVERRIDES_PATH.write_text(
        f"{json.dumps(overrides_payload, indent=2)}\n", encoding="utf-8"
    )
    JERSEYS_PATH.write_text(
        f"{json.dumps(jerseys_payload, indent=2)}\n", encoding="utf-8"
    )

    print(f"Retagged to FA: {len(retagged)}")
    for name in sorted(retagged):
        print(f"  - {name}")
    print(f"Added as FA: {len(added)}")
    for name in sorted(added):
        print(f"  - {name}")
    print(f"Total FA players: {len(fa_bbrs)}")
    print(f"Pool size: {len(players)}")


if __name__ == "__main__":
    main()
