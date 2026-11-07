#!/usr/bin/env python3
"""Build data/every-team-historical-rosters.json from ESPN rosters + BBR stats.

ESPN core depth charts (`seasons/{startYear}/teams/{id}/depthcharts`) carry real
PG–C slots from 2003-04 onward. The picker also includes the rest of that
season’s roster: ESPN’s current team roster (camp / Exhibit / two-way / end of
bench) for the live year, and Basketball-Reference per-game leftovers for
historical years. 2001-02 and 2002-03 have no ESPN charts, so depth is BBR
games-started within position.

Per-game PTS / REB / AST / STL / BLK come from Basketball-Reference when that
season’s table exists. If it does not (early 2026-27), ESPN regular-season then
preseason gamelog averages fill in so Ranked auto-sort still reorders.
"""

from __future__ import annotations

import json
import re
import time
import unicodedata
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "data" / "every-team-historical-rosters.json"
CACHE_DIR = ROOT / "data" / ".every-team-cache"
HEADSHOTS_PATH = ROOT / "data" / "espn-player-headshots.json"

UA = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; NBA-every-team-rosters/1.0; "
        "+https://github.com/ballacademy/NBA-head-to-head-)"
    ),
    "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
}

# App franchise id → ESPN core team id (stable through relocations).
APP_TO_ESPN = {
    "ATL": "1",
    "BOS": "2",
    "BKN": "17",
    "CHA": "30",
    "CHI": "4",
    "CLE": "5",
    "DAL": "6",
    "DEN": "7",
    "DET": "8",
    "GSW": "9",
    "HOU": "10",
    "IND": "11",
    "LAC": "12",
    "LAL": "13",
    "MEM": "29",
    "MIA": "14",
    "MIL": "15",
    "MIN": "16",
    "NOP": "3",
    "NYK": "18",
    "OKC": "25",
    "ORL": "19",
    "PHI": "20",
    "PHX": "21",
    "POR": "22",
    "SAC": "23",
    "SAS": "24",
    "TOR": "28",
    "UTA": "26",
    "WAS": "27",
}

BBR_TO_APP = {
    "ATL": "ATL",
    "BOS": "BOS",
    "BRK": "BKN",
    "NJN": "BKN",
    "CHA": "CHA",
    "CHO": "CHA",
    "CHH": "CHA",
    "CHI": "CHI",
    "CLE": "CLE",
    "DAL": "DAL",
    "DEN": "DEN",
    "DET": "DET",
    "GSW": "GSW",
    "HOU": "HOU",
    "IND": "IND",
    "LAC": "LAC",
    "LAL": "LAL",
    "MEM": "MEM",
    "VAN": "MEM",
    "MIA": "MIA",
    "MIL": "MIL",
    "MIN": "MIN",
    "NOP": "NOP",
    "NOH": "NOP",
    "NOK": "NOP",
    "NYK": "NYK",
    "OKC": "OKC",
    "SEA": "OKC",
    "ORL": "ORL",
    "PHI": "PHI",
    "PHO": "PHX",
    "PHX": "PHX",
    "POR": "POR",
    "SAC": "SAC",
    "SAS": "SAS",
    "TOR": "TOR",
    "UTA": "UTA",
    "WAS": "WAS",
    "WSB": "WAS",
}

POSITIONS = ("PG", "SG", "SF", "PF", "C")
POS_INDEX = {pos: i for i, pos in enumerate(POSITIONS)}
EXTRA_DEPTH = 99
HEADSHOT_CDN = "https://a.espncdn.com/i/headshots/nba/players/full/{id}.png"
FIRST_SEASON = "2001-02"
SUFFIX_PATTERN = re.compile(r"\b(jr|sr|ii|iii|iv|v)\b", re.I)
TAG_RE = re.compile(r"<[^>]+>")
ATHLETE_ID_RE = re.compile(r"/athletes/(\d+)")

# No NBA club in that city / franchise that season.
KNOWN_MISSING: dict[tuple[str, str], str] = {
    ("CHA", "2002-03"): (
        "No Charlotte NBA team in 2002-03 (Hornets moved to New Orleans; "
        "Bobcats started in 2004-05)."
    ),
    ("CHA", "2003-04"): (
        "No Charlotte NBA team in 2003-04 (Hornets played in New Orleans; "
        "Bobcats started in 2004-05)."
    ),
    ("NOP", "2001-02"): (
        "No New Orleans NBA team in 2001-02 (the Hornets still played in Charlotte)."
    ),
}


def season_start_year(season: str) -> int:
    return int(season.split("-")[0])


def season_end_year(season: str) -> int:
    start, suffix = season.split("-")
    return int(start[:2] + suffix)


def season_label(start_year: int) -> str:
    return f"{start_year}-{str(start_year + 1)[2:]}"


def current_season_label() -> str:
    # NBA season that includes October of this calendar year.
    now = datetime.now(timezone.utc)
    start = now.year if now.month >= 10 else now.year - 1
    return season_label(start)


def all_seasons(last: str) -> list[str]:
    years = range(season_start_year(FIRST_SEASON), season_start_year(last) + 1)
    return [season_label(year) for year in years]


def normalize_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(char for char in decomposed if not unicodedata.combining(char))
    stripped = SUFFIX_PATTERN.sub("", stripped)
    stripped = re.sub(r"[^a-zA-Z]", "", stripped)
    return stripped.lower()


def fetch_bytes(url: str, retries: int = 4, timeout: int = 30) -> bytes:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.4 * (attempt + 1))
    raise RuntimeError(f"Failed {url}") from last


def fetch_json(url: str) -> dict | list:
    return json.loads(fetch_bytes(url).decode("utf-8"))


def fetch_html(url: str) -> str:
    return fetch_bytes(url).decode("utf-8", "replace")


def cache_path(kind: str, key: str) -> Path:
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", key)
    folder = CACHE_DIR / kind
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{safe}.json"


def cached_json(kind: str, key: str, loader):
    path = cache_path(kind, key)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    payload = loader()
    path.write_text(json.dumps(payload), encoding="utf-8")
    return payload


def parse_position(raw: str) -> str:
    text = str(raw or "").upper().replace(".", "").strip()
    token = re.split(r"[-/,\s]+", text)[0] if text else ""
    if token in POS_INDEX:
        return token
    if token == "G":
        return "SG"
    if token in {"F", "FC"}:
        return "SF"
    if token in {"C", "CF"}:
        return "C"
    return "SF"


def num(value) -> float | None:
    try:
        if value is None or value == "":
            return None
        return round(float(value), 1)
    except (TypeError, ValueError):
        return None


def intish(value) -> int:
    parsed = num(value)
    return int(parsed) if parsed is not None else 0


class _StatRowParser(HTMLParser):
    """Collect Basketball-Reference per-game rows via data-stat attributes."""

    def __init__(self) -> None:
        super().__init__()
        self.rows: list[dict[str, str]] = []
        self._row: dict[str, str] | None = None
        self._attr = ""
        self._parts: list[str] = []
        self._capture = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {key: value or "" for key, value in attrs}
        if tag == "tr":
            self._row = {}
            return
        if self._row is None:
            return
        if tag in {"td", "th"} and "data-stat" in data:
            self._attr = data["data-stat"]
            self._parts = []
            self._capture = True
            csv_id = data.get("data-append-csv")
            if csv_id:
                self._row["bbrId"] = csv_id
            return
        if tag == "a" and self._attr in {"name_display", "player", "team_name_abbr"}:
            href = data.get("href") or ""
            match = re.search(r"/players/[a-z]/([^./]+)\.html", href)
            if match and "bbrId" not in self._row:
                self._row["bbrId"] = match.group(1)

    def handle_data(self, data: str) -> None:
        if self._capture:
            self._parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._capture and self._row is not None:
            self._row[self._attr] = "".join(self._parts).strip()
            self._capture = False
            self._attr = ""
            self._parts = []
        elif tag == "tr" and self._row is not None:
            if self._row.get("bbrId") or self._row.get("name_display") or self._row.get("player"):
                self.rows.append(self._row)
            self._row = None


def parse_bbr_per_game(html: str) -> list[dict]:
    parser = _StatRowParser()
    parser.feed(html)
    players: list[dict] = []
    for row in parser.rows:
        name = row.get("name_display") or row.get("player") or ""
        team = (row.get("team_name_abbr") or row.get("team_id") or "").upper()
        if not name or name == "Player" or team in {"", "TOT", "2TM", "3TM", "4TM"}:
            continue
        franchise = BBR_TO_APP.get(team)
        if not franchise:
            continue
        players.append(
            {
                "bbrId": row.get("bbrId") or "",
                "name": name,
                "team": franchise,
                "historyId": team,
                "position": parse_position(row.get("pos") or ""),
                "gp": intish(row.get("games") or row.get("g")),
                "gs": intish(row.get("games_started") or row.get("gs")),
                "mp": num(row.get("mp_per_g") or row.get("mp")),
                "pts": num(row.get("pts_per_g") or row.get("pts")),
                "reb": num(row.get("trb_per_g") or row.get("trb")),
                "ast": num(row.get("ast_per_g") or row.get("ast")),
                "stl": num(row.get("stl_per_g") or row.get("stl")),
                "blk": num(row.get("blk_per_g") or row.get("blk")),
            }
        )
    # BBR pages repeat the table (live + commented). Keep the fullest row.
    best: dict[tuple[str, str], dict] = {}
    for player in players:
        key = (player["bbrId"] or normalize_name(player["name"]), player["team"])
        current = best.get(key)
        if current is None or player["gp"] > current["gp"] or (
            player["gp"] == current["gp"] and (player["gs"], player["mp"] or 0)
            > (current["gs"], current["mp"] or 0)
        ):
            best[key] = player
    return list(best.values())


def load_bbr_season(season: str) -> list[dict]:
    year = season_end_year(season)
    url = f"https://www.basketball-reference.com/leagues/NBA_{year}_per_game.html"

    def loader():
        html = fetch_html(url)
        rows = parse_bbr_per_game(html)
        if len(rows) < 200 and season_start_year(season) < datetime.now(timezone.utc).year:
            raise RuntimeError(f"BBR {season} parsed only {len(rows)} rows")
        return rows

    try:
        return cached_json("bbr", season, loader)
    except Exception as exc:  # noqa: BLE001
        print(f"  BBR {season} unavailable ({exc})")
        return []


def espn_depth_url(start_year: int, espn_team_id: str) -> str:
    return (
        "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/"
        f"seasons/{start_year}/teams/{espn_team_id}/depthcharts"
    )


def espn_team_url(start_year: int, espn_team_id: str) -> str:
    return (
        "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/"
        f"seasons/{start_year}/teams/{espn_team_id}"
    )


def espn_site_roster_url(espn_team_id: str) -> str:
    return (
        "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/"
        f"teams/{espn_team_id}/roster"
    )


def espn_gamelog_url(espn_id: str, season_end_year: int) -> str:
    return (
        "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/"
        f"athletes/{espn_id}/gamelog?season={season_end_year}"
    )


def parse_depthchart(payload: dict) -> list[tuple[str, int, str]]:
    items = payload.get("items") or []
    if not items:
        return []
    positions = items[0].get("positions") or {}
    rows: list[tuple[str, int, str]] = []
    for key, block in positions.items():
        pos = parse_position((block.get("position") or {}).get("abbreviation") or key)
        for entry in block.get("athletes") or []:
            ref = ((entry.get("athlete") or {}).get("$ref") or "")
            match = ATHLETE_ID_RE.search(ref)
            if not match:
                continue
            rank = int(entry.get("rank") or 99)
            rows.append((pos, rank, match.group(1)))
    # One slot per athlete: best (lowest) rank, then PG–C.
    best: dict[str, tuple[str, int]] = {}
    for pos, rank, athlete_id in rows:
        current = best.get(athlete_id)
        if current is None or rank < current[1] or (
            rank == current[1] and POS_INDEX.get(pos, 9) < POS_INDEX.get(current[0], 9)
        ):
            best[athlete_id] = (pos, rank)
    return [(pos, rank, athlete_id) for athlete_id, (pos, rank) in best.items()]


def fetch_depth_and_team(start_year: int, espn_team_id: str) -> dict:
    key = f"{start_year}-{espn_team_id}"

    def loader():
        team = {}
        try:
            team = fetch_json(espn_team_url(start_year, espn_team_id))
        except Exception:
            team = {}
        try:
            depth = fetch_json(espn_depth_url(start_year, espn_team_id))
        except urllib.error.HTTPError as exc:
            depth = {"error": exc.code, "items": []}
        except Exception as exc:  # noqa: BLE001
            depth = {"error": str(exc), "items": []}
        return {
            "abbreviation": team.get("abbreviation") or "",
            "location": team.get("location") or "",
            "name": team.get("name") or "",
            "displayName": team.get("displayName") or "",
            "slots": parse_depthchart(depth if isinstance(depth, dict) else {}),
        }

    return cached_json("espn-depth", key, loader)


def parse_site_roster(payload: dict) -> list[tuple[str, str, str]]:
    athletes = payload.get("athletes") or []
    items: list[dict] = []
    if (
        athletes
        and isinstance(athletes[0], dict)
        and athletes[0].get("id")
        and athletes[0].get("displayName")
    ):
        items = [row for row in athletes if isinstance(row, dict)]
    else:
        for group in athletes:
            if not isinstance(group, dict):
                continue
            if group.get("id") and group.get("displayName"):
                items.append(group)
                continue
            items.extend(row for row in (group.get("items") or []) if isinstance(row, dict))
    rows: list[tuple[str, str, str]] = []
    for player in items:
        espn_id = str(player.get("id") or "")
        name = str(player.get("displayName") or player.get("fullName") or "").strip()
        pos_raw = player.get("position")
        if isinstance(pos_raw, dict):
            pos_raw = pos_raw.get("abbreviation") or pos_raw.get("displayName") or ""
        if espn_id and name:
            rows.append((espn_id, name, parse_position(str(pos_raw or ""))))
    return rows


def fetch_site_roster(espn_team_id: str) -> list[tuple[str, str, str]]:
    def loader():
        try:
            payload = fetch_json(espn_site_roster_url(espn_team_id))
        except Exception as exc:  # noqa: BLE001
            print(f"  roster {espn_team_id} failed ({exc})")
            return {"athletes": []}
        return payload if isinstance(payload, dict) else {"athletes": []}

    return parse_site_roster(cached_json("espn-roster", espn_team_id, loader))


def _gamelog_type_rank(display: str) -> int:
    text = (display or "").lower()
    if "regular" in text:
        return 0
    if "preseason" in text:
        return 1
    return 2


def parse_espn_gamelog_avg(payload: dict) -> dict | None:
    names = payload.get("names") or []
    idx = {name: i for i, name in enumerate(names)}
    needed = ("points", "totalRebounds", "assists", "steals", "blocks")
    if any(key not in idx for key in needed):
        return None
    min_idx = idx.get("minutes")
    types = sorted(
        payload.get("seasonTypes") or [],
        key=lambda row: _gamelog_type_rank(str(row.get("displayName") or "")),
    )
    for block in types:
        events: list[dict] = []
        for cat in block.get("categories") or []:
            if cat.get("type") == "event":
                events.extend(cat.get("events") or [])
        totals = {key: 0.0 for key in needed}
        games = 0
        for event in events:
            stats = event.get("stats") or []
            if len(stats) <= max(idx[key] for key in needed):
                continue
            if min_idx is not None and min_idx < len(stats):
                try:
                    if float(stats[min_idx] or 0) <= 0:
                        continue
                except (TypeError, ValueError):
                    continue
            try:
                for key in needed:
                    totals[key] += float(stats[idx[key]])
            except (TypeError, ValueError):
                continue
            games += 1
        if games:
            return {
                "pts": round(totals["points"] / games, 1),
                "reb": round(totals["totalRebounds"] / games, 1),
                "ast": round(totals["assists"] / games, 1),
                "stl": round(totals["steals"] / games, 1),
                "blk": round(totals["blocks"] / games, 1),
            }
    return None


def fetch_espn_gamelog_avg(espn_id: str, season_end_year: int) -> dict | None:
    key = f"{season_end_year}-{espn_id}"

    def loader():
        try:
            payload = fetch_json(espn_gamelog_url(espn_id, season_end_year))
        except Exception:
            return {}
        return payload if isinstance(payload, dict) else {}

    return parse_espn_gamelog_avg(cached_json("espn-gamelog", key, loader))


def fetch_athlete_name(espn_id: str) -> str:
    def loader():
        for url in (
            f"https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/{espn_id}",
            f"https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/{espn_id}",
        ):
            try:
                payload = fetch_json(url)
            except Exception:
                continue
            athlete = payload.get("athlete") if isinstance(payload.get("athlete"), dict) else payload
            name = (
                athlete.get("displayName")
                or athlete.get("fullName")
                or " ".join(
                    part
                    for part in (athlete.get("firstName"), athlete.get("lastName"))
                    if part
                )
            )
            if name:
                return {"name": str(name).strip()}
        return {"name": ""}

    return str(cached_json("espn-athlete", espn_id, loader).get("name") or "")


def depth_from_bbr(rows: list[dict]) -> list[dict]:
    """Starter → backup by games started within PG–C, then leftover minutes."""
    by_pos: dict[str, list[dict]] = {pos: [] for pos in POSITIONS}
    for row in rows:
        by_pos.setdefault(row["position"], []).append(row)
    used: set[str] = set()
    ordered: list[dict] = []
    max_depth = max((len(group) for group in by_pos.values()), default=0)
    for depth in range(1, max_depth + 1):
        for pos in POSITIONS:
            group = sorted(
                (row for row in by_pos.get(pos, []) if row["bbrId"] not in used),
                key=lambda row: (-row["gs"], -(row["mp"] or 0), -(row["pts"] or 0), row["name"]),
            )
            if not group:
                continue
            pick = group[0]
            pick = {**pick, "depth": depth, "position": pos}
            used.add(pick["bbrId"])
            ordered.append(pick)
    leftovers = [
        {**row, "depth": 99}
        for row in sorted(rows, key=lambda row: (-row["gs"], -(row["mp"] or 0), row["name"]))
        if row["bbrId"] not in used
    ]
    return ordered + leftovers


def index_bbr(rows: list[dict]) -> dict[str, dict[str, list[dict]]]:
    by_team: dict[str, dict[str, list[dict]]] = {}
    for row in rows:
        team = by_team.setdefault(row["team"], {})
        team.setdefault(normalize_name(row["name"]), []).append(row)
        if row["bbrId"]:
            team.setdefault(f"bbr:{row['bbrId']}", []).append(row)
    return by_team


def take_bbr_match(candidates: list[dict], used: set[str]) -> dict | None:
    for row in candidates:
        key = row["bbrId"] or normalize_name(row["name"])
        if key in used:
            continue
        used.add(key)
        return row
    return None


def load_espn_id_from_headshots() -> dict[str, str]:
    if not HEADSHOTS_PATH.exists():
        return {}
    payload = json.loads(HEADSHOTS_PATH.read_text(encoding="utf-8"))
    by_name: dict[str, str] = {}
    for entry in (payload.get("byBbrPlayerId") or {}).values():
        espn_id = str((entry or {}).get("espnId") or "")
        name = str((entry or {}).get("name") or "")
        if espn_id and name:
            by_name[normalize_name(name)] = espn_id
    return by_name


def history_label(raw: dict, franchise: str, season: str) -> tuple[str, str]:
    abbr = str(raw.get("abbreviation") or "").upper()
    mapped = {
        "GS": "GSW",
        "NY": "NYK",
        "NO": "NOP",
        "SA": "SAS",
        "UTAH": "UTA",
        "WSH": "WAS",
        "NJ": "NJN",
        "SEA": "SEA",
        "CHH": "CHH",
        "NOH": "NOH",
    }.get(abbr, abbr)
    display = str(raw.get("displayName") or "").strip()
    if not display:
        location = str(raw.get("location") or "").strip()
        name = str(raw.get("name") or "").strip()
        display = f"{location} {name}".strip() or franchise
    history_id = mapped or franchise
    if franchise == "OKC" and (
        "seattle" in display.lower() or history_id == "SEA" or season_start_year(season) <= 2007
    ):
        if season_start_year(season) <= 2007:
            return "SEA", display or "Seattle SuperSonics"
    if franchise == "BKN" and (
        "jersey" in display.lower() or history_id in {"NJ", "NJN"} or season_start_year(season) <= 2011
    ):
        if season_start_year(season) <= 2011:
            return "NJN", display or "New Jersey Nets"
    return history_id or franchise, display or franchise


def player_payload(
    espn_id: str,
    name: str,
    position: str,
    depth: int,
    stats: dict | None,
) -> dict:
    row = {
        "id": espn_id,
        "name": name,
        "position": position,
        "depth": depth,
        "headshotUrl": HEADSHOT_CDN.replace("{id}", espn_id),
        "pts": stats.get("pts") if stats else None,
        "reb": stats.get("reb") if stats else None,
        "ast": stats.get("ast") if stats else None,
        "stl": stats.get("stl") if stats else None,
        "blk": stats.get("blk") if stats else None,
    }
    return row


def build_from_espn(
    season: str,
    franchise: str,
    depth_raw: dict,
    bbr_index: dict[str, list[dict]],
    bbr_rows: list[dict],
    names: dict[str, str],
    name_to_espn: dict[str, str],
    roster_extras: list[tuple[str, str, str]],
) -> dict | None:
    slots = depth_raw.get("slots") or []
    if not slots:
        return None
    history_id, history_name = history_label(depth_raw, franchise, season)
    used: set[str] = set()
    seen_ids: set[str] = set()
    players: list[dict] = []
    for pos, rank, espn_id in sorted(
        slots, key=lambda item: (item[1], POS_INDEX.get(item[0], 9), item[2])
    ):
        name = names.get(espn_id) or ""
        stats = take_bbr_match(bbr_index.get(normalize_name(name), []), used) if name else None
        players.append(player_payload(espn_id, name or f"Player {espn_id}", pos, rank, stats))
        seen_ids.add(espn_id)
    extras = [
        (espn_id, name, pos)
        for espn_id, name, pos in roster_extras
        if espn_id not in seen_ids
    ]
    for row in bbr_rows:
        key = row["bbrId"] or normalize_name(row["name"])
        if key in used:
            continue
        espn_id = name_to_espn.get(normalize_name(row["name"]))
        if espn_id and espn_id in seen_ids:
            take_bbr_match(bbr_index.get(normalize_name(row["name"]), []), used)
            continue
        extras.append(
            (
                espn_id
                or (f"bbr-{row['bbrId']}" if row["bbrId"] else normalize_name(row["name"])),
                row["name"],
                row["position"],
            )
        )
    extras.sort(key=lambda item: (POS_INDEX.get(item[2], 9), item[1], item[0]))
    for espn_id, name, pos in extras:
        if espn_id in seen_ids:
            continue
        stats = take_bbr_match(bbr_index.get(normalize_name(name), []), used) if name else None
        players.append(player_payload(espn_id, name or f"Player {espn_id}", pos, EXTRA_DEPTH, stats))
        seen_ids.add(espn_id)
    return {
        "historyId": history_id,
        "historyName": history_name,
        "source": "espn-depthchart",
        "players": players,
    }


def build_from_bbr(
    season: str,
    franchise: str,
    rows: list[dict],
    name_to_espn: dict[str, str],
) -> dict | None:
    if not rows:
        return None
    history_id = rows[0].get("historyId") or franchise
    history_names = {
        "SEA": "Seattle SuperSonics",
        "NJN": "New Jersey Nets",
        "CHH": "Charlotte Hornets",
        "NOH": "New Orleans Hornets",
        "NOK": "New Orleans/Oklahoma City Hornets",
        "CHO": "Charlotte Hornets",
        "VAN": "Vancouver Grizzlies",
        "BRK": "Brooklyn Nets",
        "PHO": "Phoenix Suns",
    }
    ordered = depth_from_bbr(rows)
    players: list[dict] = []
    for row in ordered:
        espn_id = name_to_espn.get(normalize_name(row["name"]))
        if not espn_id:
            # Keep the player pickable even without an ESPN id; headshot may 404.
            espn_id = f"bbr-{row['bbrId']}" if row["bbrId"] else normalize_name(row["name"])
        players.append(
            player_payload(espn_id, row["name"], row["position"], row["depth"], row)
        )
    return {
        "historyId": history_id,
        "historyName": history_names.get(history_id, franchise),
        "source": "basketball-reference",
        "players": players,
    }


def main() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    last = current_season_label()
    seasons = all_seasons(last)
    franchises = list(APP_TO_ESPN)
    print(f"Building {FIRST_SEASON}–{last} ({len(seasons)} seasons × {len(franchises)} teams)")

    print("Fetching Basketball-Reference per-game tables…")
    bbr_by_season: dict[str, list[dict]] = {}
    for season in seasons:
        rows = load_bbr_season(season)
        bbr_by_season[season] = rows
        print(f"  {season}: {len(rows)} player-team rows")
        time.sleep(1.6)

    espn_years = [
        season_start_year(season)
        for season in seasons
        if season_start_year(season) >= 2003
    ]
    jobs = [
        (year, franchise, APP_TO_ESPN[franchise])
        for year in espn_years
        for franchise in franchises
    ]
    print(f"Fetching ESPN depth charts ({len(jobs)} team-seasons)…")
    depth_by_key: dict[tuple[str, str], dict] = {}
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {
            pool.submit(fetch_depth_and_team, year, espn_id): (year, franchise)
            for year, franchise, espn_id in jobs
        }
        done = 0
        for future in as_completed(futures):
            year, franchise = futures[future]
            depth_by_key[(season_label(year), franchise)] = future.result()
            done += 1
            if done % 60 == 0:
                print(f"  depth {done}/{len(jobs)}")

    print("Fetching ESPN current team rosters…")
    site_rosters: dict[str, list[tuple[str, str, str]]] = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {
            pool.submit(fetch_site_roster, APP_TO_ESPN[franchise]): franchise
            for franchise in franchises
        }
        for future in as_completed(futures):
            franchise = futures[future]
            site_rosters[franchise] = future.result()
            print(f"  {franchise}: {len(site_rosters[franchise])} roster names")

    athlete_ids = sorted(
        {
            espn_id
            for raw in depth_by_key.values()
            for _, _, espn_id in raw.get("slots") or []
        }
        | {
            espn_id
            for rows in site_rosters.values()
            for espn_id, _, _ in rows
        }
    )
    print(f"Resolving {len(athlete_ids)} ESPN athlete names…")
    names: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = {pool.submit(fetch_athlete_name, espn_id): espn_id for espn_id in athlete_ids}
        done = 0
        for future in as_completed(futures):
            espn_id = futures[future]
            names[espn_id] = future.result()
            done += 1
            if done % 200 == 0:
                print(f"  names {done}/{len(athlete_ids)}")

    name_to_espn = {normalize_name(name): espn_id for espn_id, name in names.items() if name}
    name_to_espn.update(load_espn_id_from_headshots())

    rosters: dict[str, dict[str, dict]] = {franchise: {} for franchise in franchises}
    missing_count = 0
    espn_cells = 0
    bbr_cells = 0

    for season in seasons:
        bbr_index_all = index_bbr(bbr_by_season.get(season) or [])
        bbr_rows_by_team: dict[str, list[dict]] = {}
        for row in bbr_by_season.get(season) or []:
            bbr_rows_by_team.setdefault(row["team"], []).append(row)

        for franchise in franchises:
            known = KNOWN_MISSING.get((franchise, season))
            if known:
                rosters[franchise][season] = {"missing": True, "reason": known}
                missing_count += 1
                continue

            cell = None
            depth_raw = depth_by_key.get((season, franchise))
            if depth_raw and depth_raw.get("slots"):
                cell = build_from_espn(
                    season,
                    franchise,
                    depth_raw,
                    bbr_index_all.get(franchise) or {},
                    bbr_rows_by_team.get(franchise) or [],
                    names,
                    name_to_espn,
                    site_rosters.get(franchise, []) if season == last else [],
                )
                if cell:
                    espn_cells += 1

            if cell is None:
                cell = build_from_bbr(
                    season,
                    franchise,
                    bbr_rows_by_team.get(franchise) or [],
                    name_to_espn,
                )
                if cell:
                    bbr_cells += 1

            if cell is None:
                rosters[franchise][season] = {
                    "missing": True,
                    "reason": f"No {season} roster found for {franchise}.",
                }
                missing_count += 1
            else:
                rosters[franchise][season] = cell

    thin_seasons = {
        season for season, rows in bbr_by_season.items() if len(rows) < 200
    }
    missing_stats: list[tuple[str, str, dict]] = []
    for franchise, by_season in rosters.items():
        for season, cell in by_season.items():
            if cell.get("missing") or season not in thin_seasons:
                continue
            for player in cell.get("players") or []:
                if player.get("pts") is None and str(player.get("id") or "").isdigit():
                    missing_stats.append((franchise, season, player))
    if missing_stats:
        print(f"Filling {len(missing_stats)} missing stat rows from ESPN gamelogs…")
        patched = 0
        with ThreadPoolExecutor(max_workers=12) as pool:
            futures = {
                pool.submit(
                    fetch_espn_gamelog_avg,
                    player["id"],
                    season_end_year(season),
                ): player
                for _, season, player in missing_stats
            }
            done = 0
            for future in as_completed(futures):
                player = futures[future]
                avg = future.result()
                if avg:
                    player.update(avg)
                    patched += 1
                done += 1
                if done % 80 == 0:
                    print(f"  gamelog {done}/{len(missing_stats)}")
        print(f"  patched {patched}/{len(missing_stats)} from ESPN")

    payload = {
        "description": (
            "Every Team composer historical rosters, 2001-02 through the current "
            "NBA season. Depth order is ESPN core depth charts (starter PG–C, then "
            "backups) when ESPN publishes that team-season; otherwise Basketball-"
            "Reference games started within position. Camp, Exhibit, two-way, and "
            "end-of-bench names from ESPN’s current team roster (and BBR leftovers "
            "historically) sit after the depth units. Per-game PTS/REB/AST/STL/BLK "
            "are Basketball-Reference when that table exists; otherwise ESPN "
            "regular-season then preseason gamelog averages. Relocated franchises "
            "keep the current cell (SEA→OKC, NJN→BKN, CHH 2001-02→CHA)."
        ),
        "source": {
            "depth": "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/{year}/teams/{id}/depthcharts",
            "roster": "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{id}/roster",
            "stats": "https://www.basketball-reference.com/leagues/NBA_{endYear}_per_game.html",
            "gamelog": "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/{id}/gamelog?season={endYear}",
            "headshots": HEADSHOT_CDN,
        },
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "currentSeason": last,
        "seasons": seasons,
        "rosters": rosters,
    }
    compact = json.dumps(payload, separators=(",", ":")) + "\n"
    OUT_PATH.write_text(compact, encoding="utf-8")
    public_path = ROOT / "public" / "every-team-historical-rosters.json"
    public_path.write_text(compact, encoding="utf-8")
    player_rows = sum(
        len(cell.get("players") or [])
        for team in rosters.values()
        for cell in team.values()
    )
    print(
        f"Wrote {OUT_PATH} and {public_path} seasons={len(seasons)} espnCells={espn_cells} "
        f"bbrCells={bbr_cells} missing={missing_count} players={player_rows}"
    )


if __name__ == "__main__":
    main()
