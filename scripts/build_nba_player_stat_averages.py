#!/usr/bin/env python3
"""Build ESPN-keyed extra averages: shooting, advanced, and hustle."""

from __future__ import annotations

import json
import re
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
HEADSHOTS_PATH = ROOT / "data" / "espn-player-headshots.json"
PLAYERS_PATH = ROOT / "data" / "nba-active-tier-players.json"
ADVANCED_HTML = ROOT / "data" / ".team-stats-cache" / "NBA_2026_advanced.html"
OUT_PATH = ROOT / "data" / "nba-player-stat-averages.json"
TEAM_STATS_PATH = ROOT / "data" / "nba-team-season-stats.json"
HUSTLE_CACHE = ROOT / "data" / ".team-stats-cache"

UA = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.nba.com",
    "Referer": "https://www.nba.com/stats/players/hustle",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
}

NBA_TO_APP = {
    "NY": "NYK",
    "NYK": "NYK",
    "GS": "GSW",
    "GSW": "GSW",
    "SA": "SAS",
    "SAS": "SAS",
    "NO": "NOP",
    "NOP": "NOP",
    "WSH": "WAS",
    "WAS": "WAS",
    "PHO": "PHX",
    "PHX": "PHX",
    "UTH": "UTA",
    "UTAH": "UTA",
    "UTA": "UTA",
    "BK": "BKN",
    "BKN": "BKN",
    "BRK": "BKN",
    "CHO": "CHA",
    "CHA": "CHA",
}

SUFFIX_PATTERN = re.compile(r"\b(jr|sr|ii|iii|iv|v)\b", re.I)
TAG_RE = re.compile(r"<[^>]+>")
ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
STAT_RE = re.compile(r'data-stat="([^"]+)"[^>]*>(.*?)</t', re.S)
PLAYER_HREF_RE = re.compile(r'href="/players/[a-z]/([^"]+)\.html"')


def normalize_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(char for char in decomposed if not unicodedata.combining(char))
    stripped = SUFFIX_PATTERN.sub("", stripped)
    return re.sub(r"[^a-z0-9]+", "", stripped.lower())


def to_float(value: object) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace("+", "").replace(",", "").strip())
    except ValueError:
        return None


def round_stat(value: float | None, digits: int) -> float | None:
    if value is None:
        return None
    return round(value, digits)


def pct_rate(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value / 100.0, 3) if value > 1 else round(value, 3)


def set_num(row: dict[str, float], key: str, value: float | None, digits: int) -> None:
    rounded = round_stat(value, digits)
    if rounded is not None:
        row[key] = rounded


def parse_advanced_html(html: str) -> dict[str, dict[str, float]]:
    uncommented = re.sub(r"<!--|-->", "", html)
    match = re.search(
        r'<table[^>]*id="advanced"[^>]*>.*?</table>', uncommented, re.S
    )
    if not match:
        return {}
    by_bbr: dict[str, dict[str, float]] = {}
    for row_html in ROW_RE.findall(match.group(0)):
        href = PLAYER_HREF_RE.search(row_html)
        if not href:
            continue
        stats = {
            key: TAG_RE.sub("", value).replace("*", "").strip()
            for key, value in STAT_RE.findall(row_html)
        }
        team = (stats.get("team_name_abbr") or stats.get("team_id") or "").upper()
        if team in {"TOT", "2TM", "3TM"}:
            pass
        payload: dict[str, float] = {}
        set_num(payload, "per", to_float(stats.get("per")), 1)
        set_num(payload, "tsPct", to_float(stats.get("ts_pct")), 3)
        set_num(payload, "usgPct", pct_rate(to_float(stats.get("usg_pct"))), 3)
        set_num(payload, "ows", to_float(stats.get("ows")), 1)
        set_num(payload, "dws", to_float(stats.get("dws")), 1)
        set_num(payload, "ws", to_float(stats.get("ws")), 1)
        set_num(payload, "wsPer48", to_float(stats.get("ws_per_48")), 3)
        set_num(payload, "obpm", to_float(stats.get("obpm")), 1)
        set_num(payload, "dbpm", to_float(stats.get("dbpm")), 1)
        set_num(payload, "bpm", to_float(stats.get("bpm")), 1)
        set_num(payload, "vorp", to_float(stats.get("vorp")), 1)
        bbr_id = href.group(1)
        previous = by_bbr.get(bbr_id)
        if previous is None or team in {"TOT", "2TM", "3TM"}:
            by_bbr[bbr_id] = payload
    return by_bbr


def fetch_json(url: str, cache_name: str, timeout: int = 25) -> dict | None:
    HUSTLE_CACHE.mkdir(parents=True, exist_ok=True)
    cache_path = HUSTLE_CACHE / cache_name
    if cache_path.exists() and cache_path.stat().st_size > 200:
        return json.loads(cache_path.read_text(encoding="utf-8"))
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8", "replace"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"hustle skip {cache_name}: {error}")
        return None
    cache_path.write_text(json.dumps(payload), encoding="utf-8")
    return payload


def hustle_rows(payload: dict | None) -> tuple[list[str], list[list]]:
    if not payload:
        return [], []
    result = (payload.get("resultSets") or payload.get("resultSet") or [None])[0]
    if not result:
        return [], []
    return list(result.get("headers") or []), list(result.get("rowSet") or [])


HUSTLE_PLAYER_MAP = {
    "CHARGES_DRAWN": ("chargesDrawn", 2),
    "DEFLECTIONS": ("deflections", 1),
    "LOOSE_BALLS_RECOVERED": ("looseBallsRecovered", 1),
    "SCREEN_ASSISTS": ("screenAssists", 1),
    "SCREEN_AST_PTS": ("screenAstPts", 1),
    "CONTESTED_SHOTS": ("contestedShots", 1),
    "CONTESTED_SHOTS_2PT": ("contestedShots2pt", 1),
    "CONTESTED_SHOTS_3PT": ("contestedShots3pt", 1),
    "BOX_OUTS": ("boxOuts", 1),
    "OFF_BOXOUTS": ("offBoxOuts", 1),
    "DEF_BOXOUTS": ("defBoxOuts", 1),
}

HUSTLE_TEAM_MAP = HUSTLE_PLAYER_MAP

PBP_TEAM_IDS = {
    "1610612737": "ATL",
    "1610612738": "BOS",
    "1610612739": "CLE",
    "1610612740": "NOP",
    "1610612741": "CHI",
    "1610612742": "DAL",
    "1610612743": "DEN",
    "1610612744": "GSW",
    "1610612745": "HOU",
    "1610612746": "LAC",
    "1610612747": "LAL",
    "1610612748": "MIA",
    "1610612749": "MIL",
    "1610612750": "MIN",
    "1610612751": "BKN",
    "1610612752": "NYK",
    "1610612753": "ORL",
    "1610612754": "IND",
    "1610612755": "PHI",
    "1610612756": "PHX",
    "1610612757": "POR",
    "1610612758": "SAC",
    "1610612759": "SAS",
    "1610612760": "OKC",
    "1610612761": "TOR",
    "1610612762": "UTA",
    "1610612763": "MEM",
    "1610612764": "WAS",
    "1610612765": "DET",
    "1610612766": "CHA",
}


def per_game(total: float | None, games: float | None) -> float | None:
    if total is None or not games:
        return None
    return total / games


def merge_pbp_hustle(
    by_espn: dict[str, dict[str, float]],
    espn_names: dict[str, str],
    pbp_player: dict | None,
    pbp_team: dict | None,
    team_hustle: dict[str, dict[str, float]],
) -> int:
    count = 0
    for row in (pbp_player or {}).get("multi_row_table_data") or []:
        name = str(row.get("Name") or "")
        espn_id = espn_names.get(normalize_name(name))
        if not espn_id:
            continue
        games = to_float(row.get("GamesPlayed")) or to_float(row.get("gp"))
        payload = by_espn.setdefault(espn_id, {})
        set_num(
            payload,
            "chargesDrawn",
            per_game(to_float(row.get("Charge Fouls Drawn")), games),
            2,
        )
        count += 1
    for row in (pbp_team or {}).get("multi_row_table_data") or []:
        abbr = str(
            row.get("TeamAbbreviation") or row.get("Name") or ""
        ).upper()
        entity = str(row.get("EntityId") or row.get("TeamId") or "")
        app_id = (
            NBA_TO_APP.get(abbr, abbr if len(abbr) == 3 else "")
            or PBP_TEAM_IDS.get(entity, "")
        )
        if not app_id:
            continue
        games = to_float(row.get("GamesPlayed")) or 82.0
        payload = team_hustle.setdefault(app_id, {})
        set_num(
            payload,
            "chargesDrawn",
            per_game(to_float(row.get("Charge Fouls Drawn")), games),
            2,
        )
    return count


def main() -> None:
    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    headshots = json.loads(HEADSHOTS_PATH.read_text(encoding="utf-8"))
    roster = json.loads(PLAYERS_PATH.read_text(encoding="utf-8"))
    advanced_html = (
        ADVANCED_HTML.read_text(encoding="utf-8") if ADVANCED_HTML.exists() else ""
    )
    advanced = parse_advanced_html(advanced_html) if advanced_html else {}

    bbr_to_espn = {
        str(bbr): str((entry or {}).get("espnId") or "")
        for bbr, entry in (headshots.get("byBbrPlayerId") or {}).items()
    }
    espn_names = {
        normalize_name(str(player.get("name") or "")): str(player.get("id") or "")
        for player in roster.get("players") or []
    }

    by_espn: dict[str, dict[str, float]] = {}
    mapped = 0
    named = 0

    def espn_for(bbr_id: str, name: str) -> str:
        nonlocal mapped, named
        espn_id = bbr_to_espn.get(str(bbr_id or ""))
        if espn_id:
            mapped += 1
            return espn_id
        fallback = espn_names.get(normalize_name(name))
        if fallback:
            named += 1
            return fallback
        return ""

    for row in stats.get("players") or []:
        espn_id = espn_for(str(row.get("bbrPlayerId") or ""), str(row.get("name") or ""))
        if not espn_id:
            continue
        payload = by_espn.setdefault(espn_id, {})
        set_num(payload, "gp", to_float(row.get("gamesPlayed")), 0)
        set_num(payload, "min", to_float(row.get("minutes")), 1)
        set_num(payload, "tov", to_float(row.get("turnovers")), 1)
        set_num(payload, "fgPct", to_float(row.get("fieldGoalPct")), 3)
        set_num(payload, "fg3Pct", to_float(row.get("threePointPct")), 3)
        set_num(payload, "ftPct", to_float(row.get("freeThrowPct")), 3)
        set_num(payload, "efgPct", to_float(row.get("effectiveFieldGoalPct")), 3)
        set_num(payload, "tsPct", to_float(row.get("trueShooting")), 3)

    for bbr_id, adv in advanced.items():
        espn_id = espn_for(bbr_id, "")
        if not espn_id:
            # last chance: headshots already keyed
            continue
        payload = by_espn.setdefault(espn_id, {})
        payload.update(adv)

    player_url = (
        "https://stats.nba.com/stats/leaguehustlestatsplayer"
        "?PerMode=PerGame&LeagueID=00&Season=2025-26&SeasonType=Regular+Season"
    )
    team_url = (
        "https://stats.nba.com/stats/leaguehustlestatsteam"
        "?PerMode=PerGame&LeagueID=00&Season=2025-26&SeasonType=Regular+Season"
    )
    hustle_player = fetch_json(player_url, "hustle-player-2026.json", timeout=12)
    hustle_team = fetch_json(team_url, "hustle-team-2026.json", timeout=12)
    hustle_players = 0
    team_hustle: dict[str, dict[str, float]] = {}
    headers, rows = hustle_rows(hustle_player)
    if headers and rows:
        index = {key: i for i, key in enumerate(headers)}
        name_i = index.get("PLAYER_NAME")
        for row in rows:
            name = str(row[name_i]) if name_i is not None and name_i < len(row) else ""
            espn_id = espn_names.get(normalize_name(name))
            if not espn_id:
                continue
            payload = by_espn.setdefault(espn_id, {})
            for src, (dest, digits) in HUSTLE_PLAYER_MAP.items():
                col = index.get(src)
                if col is None or col >= len(row):
                    continue
                set_num(payload, dest, to_float(row[col]), digits)
            hustle_players += 1

    headers, rows = hustle_rows(hustle_team)
    if headers and rows:
        index = {key: i for i, key in enumerate(headers)}
        abbr_i = index.get("TEAM_ABBREVIATION")
        for row in rows:
            abbr = (
                str(row[abbr_i]).upper()
                if abbr_i is not None and abbr_i < len(row)
                else ""
            )
            app_id = NBA_TO_APP.get(abbr, abbr)
            if not app_id:
                continue
            payload: dict[str, float] = {}
            for src, (dest, digits) in HUSTLE_TEAM_MAP.items():
                col = index.get(src)
                if col is None or col >= len(row):
                    continue
                set_num(payload, dest, to_float(row[col]), digits)
            if payload:
                team_hustle[app_id] = payload

    if hustle_players == 0 or len(team_hustle) < 28:
        pbp_player = fetch_json(
            "https://api.pbpstats.com/get-totals/nba?Season=2025-26&SeasonType=Regular%20Season&Type=Player",
            "pbp-player-2026.json",
            timeout=30,
        )
        pbp_team = fetch_json(
            "https://api.pbpstats.com/get-totals/nba?Season=2025-26&SeasonType=Regular%20Season&Type=Team",
            "pbp-team-2026.json",
            timeout=30,
        )
        hustle_players = merge_pbp_hustle(
            by_espn, espn_names, pbp_player, pbp_team, team_hustle
        )

    if team_hustle and TEAM_STATS_PATH.exists():
        catalog = json.loads(TEAM_STATS_PATH.read_text(encoding="utf-8"))
        season_rows = catalog.setdefault("seasons", {}).setdefault("2025-26", {})
        for team_id, extra in team_hustle.items():
            row = season_rows.setdefault(team_id, {})
            row.update(extra)
        TEAM_STATS_PATH.write_text(
            json.dumps(catalog, indent=2) + "\n", encoding="utf-8"
        )
        print(f"patched team hustle onto 2025-26 ({len(team_hustle)} teams)")

    OUT_PATH.write_text(
        json.dumps(
            {
                "description": (
                    "2025-26 regular-season extra averages (GP/MIN/TOV/shooting/"
                    "advanced/hustle) keyed by ESPN id."
                ),
                "season": stats.get("season") or "2025-26",
                "sourceFile": "data/nba-stats/nba-player-stats-202526-regular-season.json",
                "matched": len(by_espn),
                "mappedFromBbr": mapped,
                "mappedFromName": named,
                "advancedPlayers": len(advanced),
                "hustlePlayers": hustle_players,
                "byEspnId": dict(sorted(by_espn.items(), key=lambda item: item[0])),
            },
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )
    print(
        f"wrote {len(by_espn)} extras "
        f"(advanced {len(advanced)}, hustle {hustle_players}) -> {OUT_PATH}"
    )


if __name__ == "__main__":
    main()
