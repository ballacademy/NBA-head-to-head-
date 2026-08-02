#!/usr/bin/env python3
"""
Pull current ESPN roster athletes missing from the season-stats pool
(typically brand-new draftees + undrafted free agents) into
data/espn-roster-additions.json so they can be drafted in-game.
"""

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
OUT_PATH = ROOT / "data/espn-roster-additions.json"
DRAFT_CLASSES_PATH = ROOT / "data/draft-classes.json"
TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=50"

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

# Two-way / UDFA floor and first-overall-ish ceiling for draftability.
DEFAULT_UDFA_SALARY = 1_157_153
DEFAULT_ROOKIE_SALARY = 2_500_000

POSITION_MAP = {
    "PG": "PG",
    "SG": "SG",
    "SF": "SF",
    "PF": "PF",
    "C": "C",
    "G": "SG",
    "F": "SF",
    "G-F": "SF",
    "F-G": "SF",
    "F-C": "PF",
    "C-F": "C",
}


def normalize_name(name: str) -> str:
    text = unicodedata.normalize("NFKD", name)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = SUFFIX_PATTERN.sub("", text)
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def map_position(abbr: str | None) -> tuple[str, list[str]]:
    key = (abbr or "F").upper()
    primary = POSITION_MAP.get(key, "SF")
    if key == "G":
        return "SG", ["PG", "SG"]
    if key == "F":
        return "SF", ["SF", "PF"]
    if key in {"F-C", "C-F"}:
        return primary, ["PF", "C"]
    if key in {"G-F", "F-G"}:
        return primary, ["SG", "SF"]
    return primary, [primary]


def empty_production(name: str, team: str, espn_id: str, position: str, positions: list[str], age: int | None, jersey: str | None) -> dict:
    bbr_id = f"espn-{espn_id}"
    return {
        "id": f"{bbr_id}-{team.lower()}",
        "bbrPlayerId": bbr_id,
        "espnId": espn_id,
        "name": name,
        "team": team,
        "statsTeam": team,
        "position": position,
        "positions": positions,
        "age": age,
        "gamesPlayed": 0,
        "gamesStarted": 0,
        "minutes": 0,
        "points": 0,
        "rebounds": 0,
        "assists": 0,
        "steals": 0,
        "blocks": 0,
        "turnovers": 0,
        "fieldGoalsMade": 0,
        "fieldGoalsAttempted": 0,
        "fieldGoalPct": 0,
        "threePointersMade": 0,
        "threePointersAttempted": 0,
        "threePointPct": 0,
        "freeThrowsMade": 0,
        "freeThrowsAttempted": 0,
        "freeThrowPct": 0,
        "offensiveRebounds": 0,
        "defensiveRebounds": 0,
        "personalFouls": 0,
        "effectiveFieldGoalPct": 0,
        "trueShooting": 0.5,
        "salary": DEFAULT_ROOKIE_SALARY if jersey else DEFAULT_UDFA_SALARY,
        "jerseyNumber": int(jersey) if jersey and str(jersey).isdigit() else None,
        "draftYear": 2026,
        "rosterSource": "espn-roster-api",
        "isRosterAddition": True,
    }


def main() -> None:
    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    existing_norms = {
        normalize_name(player["name"]) for player in stats["players"]
    }

    teams_payload = fetch_json(TEAMS_URL)
    additions: list[dict] = []
    seen_espn: set[str] = set()

    for entry in teams_payload["sports"][0]["leagues"][0]["teams"]:
        team = entry["team"]
        espn_abbr = str(team["abbreviation"])
        bbr_team = ESPN_TO_BBR.get(espn_abbr, espn_abbr)
        roster_url = (
            "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/"
            f"{team['id']}/roster"
        )
        roster = fetch_json(roster_url)

        for athlete in roster.get("athletes", []):
            experience = athlete.get("experience")
            years = (
                experience.get("years")
                if isinstance(experience, dict)
                else experience
            )
            if years not in (0, "0"):
                continue

            name = str(athlete.get("displayName") or athlete.get("fullName"))
            espn_id = str(athlete["id"])
            if espn_id in seen_espn:
                continue
            if normalize_name(name) in existing_norms:
                continue

            seen_espn.add(espn_id)
            pos_abbr = (athlete.get("position") or {}).get("abbreviation")
            position, positions = map_position(pos_abbr)
            additions.append(
                empty_production(
                    name=name,
                    team=bbr_team,
                    espn_id=espn_id,
                    position=position,
                    positions=positions,
                    age=athlete.get("age"),
                    jersey=athlete.get("jersey"),
                )
            )

        time.sleep(0.05)

    additions.sort(key=lambda row: (row["team"], row["name"]))

    payload = {
        "description": (
            "ESPN roster athletes with 0 years experience who are missing from "
            "the Basketball-Reference season stats pool (new draftees + UDFAs)."
        ),
        "source": "espn-roster-api",
        "draftYear": 2026,
        "generatedAt": datetime.now(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z"),
        "playerCount": len(additions),
        "players": additions,
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    draft = json.loads(DRAFT_CLASSES_PATH.read_text(encoding="utf-8"))
    classes = draft.setdefault("classes", {})
    class_2026 = set(classes.get("2026", []))
    class_2026.update(player["bbrPlayerId"] for player in additions)
    classes["2026"] = sorted(class_2026)
    draft["source"] = (
        "Basketball-Reference draft boards matched to season stats pool, plus "
        "ESPN 2026 roster rookies/UDFAs from espn-roster-additions.json."
    )
    DRAFT_CLASSES_PATH.write_text(
        json.dumps(draft, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"additions={len(additions)} -> {OUT_PATH}")
    print(f"draft class 2026 size={len(classes['2026'])}")


if __name__ == "__main__":
    main()
