#!/usr/bin/env python3
"""Build data/nba-active-tier-players.json from live ESPN 30-team rosters."""

from __future__ import annotations

import json
import re
import unicodedata
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
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


CORE_ATHLETE_URL = (
    "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/{id}"
)
WEB_ATHLETE_URL = (
    "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/{id}"
)

USA_ALIASES = {
    "usa",
    "us",
    "u.s.",
    "u.s.a.",
    "united states",
    "united states of america",
}

ALL_STAR_FILES = (
    ROOT / "data" / "all-stars-career-active.json",
    ROOT / "data" / "all-stars-2026.json",
    ROOT / "data" / "all-stars-recent.json",
)


def parse_draft_year(display: object) -> int | None:
    text = str(display or "").strip()
    match = re.match(r"(\d{4})", text)
    if not match:
        return None
    year = int(match.group(1))
    return year if 1970 <= year <= 2030 else None


def parse_draft_pick(display: object) -> tuple[int | None, int | None]:
    text = str(display or "")
    round_match = re.search(r"Rd\s+(\d+)", text, re.I)
    pick_match = re.search(r"Pk\s+(\d+)", text, re.I)
    rnd = int(round_match.group(1)) if round_match else None
    pick = int(pick_match.group(1)) if pick_match else None
    if rnd is not None and not 1 <= rnd <= 2:
        rnd = None
    if pick is not None and not 1 <= pick <= 60:
        pick = None
    return rnd, pick


def normalize_country(raw: object) -> str | None:
    text = str(raw or "").strip()
    if not text:
        return None
    if text.lower() in USA_ALIASES:
        return "United States"
    return text


def parse_experience_years(raw: object) -> int | None:
    if isinstance(raw, dict) and isinstance(raw.get("years"), (int, float)):
        years = int(raw["years"])
        return years if 0 <= years <= 40 else None
    text = str(raw or "")
    if re.search(r"rookie", text, re.I):
        return 0
    match = re.search(r"(\d+)", text)
    if not match:
        return None
    years = int(match.group(1))
    return years if 0 <= years <= 40 else None


def parse_core_draft(draft: object) -> tuple[int | None, int | None, int | None]:
    if not isinstance(draft, dict):
        return None, None, None
    year = draft.get("year")
    rnd = draft.get("round")
    pick = draft.get("selection")
    year_n = int(year) if isinstance(year, (int, float)) else None
    round_n = int(rnd) if isinstance(rnd, (int, float)) else None
    pick_n = int(pick) if isinstance(pick, (int, float)) else None
    if year_n is not None and not 1970 <= year_n <= 2030:
        year_n = None
    if round_n is not None and not 1 <= round_n <= 2:
        round_n = None
    if pick_n is not None and not 1 <= pick_n <= 60:
        pick_n = None
    return year_n, round_n, pick_n


def load_all_star_espn_ids() -> set[str]:
    bbr_ids: set[str] = set()
    for path in ALL_STAR_FILES:
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        bbr_ids.update(str(item) for item in payload.get("bbrPlayerIds") or [])
    espn_ids: set[str] = set()
    if HEADSHOTS_PATH.exists():
        headshots = json.loads(HEADSHOTS_PATH.read_text(encoding="utf-8"))
        for bbr_id, entry in (headshots.get("byBbrPlayerId") or {}).items():
            if str(bbr_id) in bbr_ids:
                espn_id = str((entry or {}).get("espnId") or "")
                if espn_id:
                    espn_ids.add(espn_id)
    return espn_ids


def fetch_athlete_meta(espn_id: str) -> dict:
    meta = {
        "draftYear": None,
        "draftRound": None,
        "draftPick": None,
        "country": None,
        "experienceYears": None,
    }
    try:
        core = fetch_json(CORE_ATHLETE_URL.format(id=espn_id))
    except Exception:
        core = {}
    year, rnd, pick = parse_core_draft(core.get("draft"))
    country = normalize_country((core.get("birthPlace") or {}).get("country"))
    experience = parse_experience_years(core.get("experience"))
    if year is None or rnd is None or pick is None or country is None or experience is None:
        try:
            web = fetch_json(WEB_ATHLETE_URL.format(id=espn_id)).get("athlete") or {}
        except Exception:
            web = {}
        if year is None:
            year = parse_draft_year(web.get("displayDraft"))
        if rnd is None or pick is None:
            parsed_round, parsed_pick = parse_draft_pick(web.get("displayDraft"))
            rnd = rnd if rnd is not None else parsed_round
            pick = pick if pick is not None else parsed_pick
        if experience is None:
            experience = parse_experience_years(web.get("displayExperience"))
        if country is None:
            place = str(web.get("displayBirthPlace") or "")
            if "," in place:
                country = normalize_country(place.rsplit(",", 1)[-1])
    meta["draftYear"] = year
    meta["draftRound"] = rnd
    meta["draftPick"] = pick
    meta["country"] = country
    meta["experienceYears"] = experience
    return meta


def attach_athlete_meta(players: list[dict]) -> dict[str, int]:
    missing = {
        "draft": 0,
        "country": 0,
        "experience": 0,
    }
    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = {
            pool.submit(fetch_athlete_meta, str(player["id"])): player
            for player in players
        }
        for future in as_completed(futures):
            player = futures[future]
            meta = future.result()
            player.update(meta)
            if meta["draftYear"] is None:
                missing["draft"] += 1
            if not meta["country"]:
                missing["country"] += 1
            if meta["experienceYears"] is None:
                missing["experience"] += 1
    return missing


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
                    "draftYear": None,
                    "draftRound": None,
                    "draftPick": None,
                    "country": None,
                    "experienceYears": None,
                    "allStar": False,
                }
            )

    missing = attach_athlete_meta(players)
    all_star_ids = load_all_star_espn_ids()
    all_star_hits = 0
    for player in players:
        player["allStar"] = player["id"] in all_star_ids
        if player["allStar"]:
            all_star_hits += 1
    players.sort(key=lambda row: (row["name"].lower(), row["id"]))
    payload = {
        "description": (
            "Currently active NBA roster players for the Instagram player tier-list "
            "composer. Metadata only — headshots load from ESPN CDN on demand. "
            "Age/height/positionGroup from ESPN site roster API; five-spot position "
            "filled from Basketball-Reference when an ESPN id matches. Draft, "
            "country, and experience from ESPN core athlete; All-Star from BBR "
            "career/recent/2026 lists mapped through ESPN ids."
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
    countries = sorted({row["country"] for row in players if row.get("country")})
    print(
        f"Wrote {len(players)} players, {len(teams)} teams, "
        f"detail positions {detail_hits}, missing age {missing_age}, "
        f"missing height {missing_height}, missing draft {missing['draft']}, "
        f"missing country {missing['country']}, missing experience "
        f"{missing['experience']}, all-stars {all_star_hits}, "
        f"countries {len(countries)}, positions {positions} -> {OUT_PATH}"
    )


if __name__ == "__main__":
    main()
