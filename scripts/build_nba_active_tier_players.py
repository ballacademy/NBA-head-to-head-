#!/usr/bin/env python3
"""Build data/nba-active-tier-players.json from live ESPN 30-team rosters."""

from __future__ import annotations

import json
import re
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "data" / "nba-active-tier-players.json"
STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
HEADSHOTS_PATH = ROOT / "data" / "espn-player-headshots.json"

ESPN_TEAMS_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=50"
)
HEADSHOT_CDN = "https://a.espncdn.com/i/headshots/nba/players/full/{espnId}.png"
ROSTER_SOURCE = (
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{id}/roster"
)

# ESPN team abbreviation → app team id (stands/tier composer).
ESPN_TO_APP = {
    "GS": "GSW",
    "NY": "NYK",
    "NO": "NOP",
    "SA": "SAS",
    "UTAH": "UTA",
    "WSH": "WAS",
}

DIVISION_TEAMS = {
    "Atlantic": ["BOS", "BKN", "NYK", "PHI", "TOR"],
    "Central": ["CHI", "CLE", "DET", "IND", "MIL"],
    "Southeast": ["ATL", "CHA", "MIA", "ORL", "WAS"],
    "Northwest": ["DEN", "MIN", "OKC", "POR", "UTA"],
    "Pacific": ["GSW", "LAC", "LAL", "PHX", "SAC"],
    "Southwest": ["DAL", "HOU", "MEM", "NOP", "SAS"],
}

TEAM_TO_DIVISION = {
    team: division
    for division, teams in DIVISION_TEAMS.items()
    for team in teams
}

DETAIL_POSITIONS = {"PG", "SG", "SF", "PF", "C"}
GROUP_POSITIONS = {"G", "F", "C"}
SUFFIX_PATTERN = re.compile(r"\b(jr|sr|ii|iii|iv|v)\b", re.I)


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 NBA-tier-list"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(char for char in decomposed if not unicodedata.combining(char))
    stripped = SUFFIX_PATTERN.sub("", stripped)
    stripped = re.sub(r"[^a-zA-Z]", "", stripped)
    return stripped.lower()


def app_team_id(espn_abbr: str) -> str:
    return ESPN_TO_APP.get(espn_abbr, espn_abbr)


def parse_height_inches(raw) -> int | None:
    if raw is None:
        return None
    try:
        value = int(round(float(raw)))
    except (TypeError, ValueError):
        return None
    return value if 60 <= value <= 96 else None


def parse_age(raw) -> int | None:
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None
    return value if 17 <= value <= 50 else None


def espn_position(athlete: dict) -> str:
    pos = athlete.get("position") or {}
    abbr = str(pos.get("abbreviation") or "").upper().replace(" ", "")
    if abbr in GROUP_POSITIONS:
        return abbr
    if abbr in DETAIL_POSITIONS:
        return "G" if abbr in {"PG", "SG"} else "F" if abbr in {"SF", "PF"} else "C"
    name = str(pos.get("name") or pos.get("displayName") or "").lower()
    if "guard" in name:
        return "G"
    if "forward" in name:
        return "F"
    if "center" in name:
        return "C"
    return "F"


def load_detail_positions() -> dict[str, str]:
    """Map ESPN athlete id → PG/SG/SF/PF/C via vendored BBR stats + headshot ids."""
    by_espn: dict[str, str] = {}
    if not STATS_PATH.exists():
        return by_espn

    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    by_bbr: dict[str, str] = {}
    by_name: dict[str, list[str]] = {}
    for player in stats.get("players", []):
        pos = str(player.get("position") or "").upper()
        if pos not in DETAIL_POSITIONS:
            continue
        bbr = str(player.get("bbrPlayerId") or "")
        if bbr:
            by_bbr[bbr] = pos
        by_name.setdefault(normalize_name(str(player.get("name") or "")), []).append(pos)

    if HEADSHOTS_PATH.exists():
        headshots = json.loads(HEADSHOTS_PATH.read_text(encoding="utf-8"))
        for bbr_id, entry in (headshots.get("byBbrPlayerId") or {}).items():
            espn_id = str((entry or {}).get("espnId") or "")
            pos = by_bbr.get(bbr_id)
            if espn_id and pos:
                by_espn[espn_id] = pos

    # Name fallback for unmatched ESPN ids (unique names only).
    unique_names = {
        name: positions[0]
        for name, positions in by_name.items()
        if len(set(positions)) == 1
    }
    by_espn["_by_name"] = unique_names  # type: ignore[assignment]
    return by_espn


def iter_athletes(roster: dict) -> list[dict]:
    athletes = roster.get("athletes") or []
    rows: list[dict] = []
    for entry in athletes:
        if isinstance(entry, dict) and isinstance(entry.get("items"), list):
            rows.extend(item for item in entry["items"] if isinstance(item, dict))
        elif isinstance(entry, dict):
            rows.append(entry)
    return rows


def main() -> None:
    detail = load_detail_positions()
    by_name = detail.pop("_by_name", {})  # type: ignore[arg-type]
    teams_payload = fetch_json(ESPN_TEAMS_URL)
    nba_teams = teams_payload["sports"][0]["leagues"][0]["teams"]

    players: list[dict] = []
    seen: set[str] = set()
    missing_age = missing_height = 0
    detail_hits = 0

    for entry in nba_teams:
        team = entry["team"]
        espn_abbr = str(team["abbreviation"])
        app_id = app_team_id(espn_abbr)
        if app_id not in TEAM_TO_DIVISION:
            raise SystemExit(f"Unmapped ESPN team {espn_abbr} -> {app_id}")
        roster = fetch_json(
            f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/"
            f"{team['id']}/roster"
        )
        for athlete in iter_athletes(roster):
            espn_id = str(athlete.get("id") or "")
            name = str(athlete.get("displayName") or athlete.get("fullName") or "").strip()
            if not espn_id or not name or espn_id in seen:
                continue
            seen.add(espn_id)
            age = parse_age(athlete.get("age"))
            height_inches = parse_height_inches(athlete.get("height"))
            display_height = str(athlete.get("displayHeight") or "").strip() or None
            group = espn_position(athlete)
            detail_pos = detail.get(espn_id) or by_name.get(normalize_name(name))
            if detail_pos:
                detail_hits += 1
            if age is None:
                missing_age += 1
            if height_inches is None:
                missing_height += 1
            players.append(
                {
                    "id": espn_id,
                    "name": name,
                    "team": app_id,
                    "headshotUrl": HEADSHOT_CDN.replace("{espnId}", espn_id),
                    "age": age,
                    "heightInches": height_inches,
                    "displayHeight": display_height,
                    "position": detail_pos or group,
                    "positionGroup": group,
                    "division": TEAM_TO_DIVISION[app_id],
                }
            )

    players.sort(key=lambda row: (row["name"].lower(), row["id"]))
    payload = {
        "description": (
            "Currently active NBA roster players for the Instagram player tier-list "
            "composer. Metadata only — headshots load from ESPN CDN on demand. "
            "Age/height/positionGroup from ESPN site roster API; five-spot position "
            "filled from Basketball-Reference when an ESPN id matches."
        ),
        "source": ROSTER_SOURCE,
        "headshotCdn": HEADSHOT_CDN,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "playerCount": len(players),
        "players": players,
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    teams = sorted({row["team"] for row in players})
    positions = sorted({row["position"] for row in players})
    print(
        f"Wrote {len(players)} players, {len(teams)} teams, "
        f"detail positions {detail_hits}, missing age {missing_age}, "
        f"missing height {missing_height}, positions {positions} -> {OUT_PATH}"
    )


if __name__ == "__main__":
    main()
