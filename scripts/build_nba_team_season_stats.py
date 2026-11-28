#!/usr/bin/env python3
"""Build data/nba-team-season-stats.json from Basketball-Reference team tables."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROSTER_PATH = ROOT / "data" / "every-team-historical-rosters.json"
OUT_PATH = ROOT / "data" / "nba-team-season-stats.json"
CACHE_DIR = ROOT / "data" / ".team-stats-cache"

UA = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; NBA-team-stats/1.0; "
        "+https://github.com/ballacademy/NBA-head-to-head-)"
    ),
    "Accept": "text/html;q=0.9,*/*;q=0.8",
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

TAG_RE = re.compile(r"<[^>]+>")
TABLE_RE = re.compile(r'<table[^>]*id="([^"]+)"[^>]*>.*?</table>', re.S)
ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
STAT_RE = re.compile(r'data-stat="([^"]+)"[^>]*>(.*?)</t', re.S)
TEAM_HREF_RE = re.compile(r"href=['\"]/teams/([A-Z]{3})/\d{4}\.html['\"]")


def season_end_year(season: str) -> int:
    start, end = season.split("-")
    return int(start[:2] + end) if len(end) == 2 else int(end)


def fetch_html(url: str, cache_name: str) -> tuple[str | None, bool]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / cache_name
    if cache_path.exists() and cache_path.stat().st_size > 20_000:
        return cache_path.read_text(encoding="utf-8"), True
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            html = response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None, False
        raise
    cache_path.write_text(html, encoding="utf-8")
    return html, False


def parse_table(html: str, table_id: str) -> list[dict[str, str]]:
    uncommented = re.sub(r"<!--|-->", "", html)
    match = re.search(
        rf'<table[^>]*id="{re.escape(table_id)}"[^>]*>.*?</table>',
        uncommented,
        re.S,
    )
    if not match:
        return []
    rows: list[dict[str, str]] = []
    for row_html in ROW_RE.findall(match.group(0)):
        href = TEAM_HREF_RE.search(row_html)
        if not href:
            continue
        stats = {
            key: TAG_RE.sub("", value).replace("*", "").strip()
            for key, value in STAT_RE.findall(row_html)
        }
        stats["bbrTeam"] = href.group(1)
        rows.append(stats)
    return rows


def to_float(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
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


def season_payload(html: str) -> dict[str, dict[str, float]]:
    per_game = {row["bbrTeam"]: row for row in parse_table(html, "per_game-team")}
    advanced = {row["bbrTeam"]: row for row in parse_table(html, "advanced-team")}
    teams: dict[str, dict[str, float]] = {}
    for bbr_id, row in per_game.items():
        app_id = BBR_TO_APP.get(bbr_id)
        if not app_id:
            continue
        adv = advanced.get(bbr_id, {})
        pts = to_float(row.get("pts"))
        reb = to_float(row.get("trb"))
        ast = to_float(row.get("ast"))
        stl = to_float(row.get("stl"))
        blk = to_float(row.get("blk"))
        payload = {
            "points": round_stat(pts, 1),
            "rebounds": round_stat(reb, 1),
            "assists": round_stat(ast, 1),
            "steals": round_stat(stl, 1),
            "blocks": round_stat(blk, 1),
            "turnovers": round_stat(to_float(row.get("tov")), 1),
            "fgPct": round_stat(to_float(row.get("fg_pct")), 3),
            "fg3Pct": round_stat(to_float(row.get("fg3_pct")), 3),
            "ftPct": round_stat(to_float(row.get("ft_pct")), 3),
            "efgPct": round_stat(to_float(adv.get("efg_pct")), 3),
            "tsPct": round_stat(to_float(adv.get("ts_pct")), 3),
            "pace": round_stat(to_float(adv.get("pace")), 1),
            "offRtg": round_stat(to_float(adv.get("off_rtg")), 1),
            "defRtg": round_stat(to_float(adv.get("def_rtg")), 1),
            "netRtg": round_stat(to_float(adv.get("net_rtg")), 1),
            "tovPct": pct_rate(to_float(adv.get("tov_pct"))),
            "orbPct": pct_rate(to_float(adv.get("orb_pct"))),
            "minutes": round_stat(to_float(row.get("mp")), 1),
            "games": round_stat(to_float(row.get("g")), 0),
        }
        if pts is not None and reb is not None and ast is not None:
            payload["pra"] = round(pts + reb + ast, 1)
        if stl is not None and blk is not None:
            payload["stocks"] = round(stl + blk, 1)
        cleaned = {key: value for key, value in payload.items() if value is not None}
        if cleaned.get("points") is None:
            continue
        teams[app_id] = cleaned
    return teams


def main() -> None:
    catalog = json.loads(ROSTER_PATH.read_text(encoding="utf-8"))
    seasons: list[str] = list(catalog.get("seasons") or [])
    by_season: dict[str, dict[str, dict[str, float]]] = {}
    for index, season in enumerate(seasons):
        year = season_end_year(season)
        url = f"https://www.basketball-reference.com/leagues/NBA_{year}.html"
        html, cached = fetch_html(url, f"NBA_{year}.html")
        if not html:
            print(f"skip {season} (no page)")
            continue
        teams = season_payload(html)
        if len(teams) < 28:
            print(f"skip {season} (only {len(teams)} teams)")
            continue
        by_season[season] = teams
        print(f"{season} {len(teams)} teams{' (cache)' if cached else ''}")
        if not cached and index + 1 < len(seasons):
            time.sleep(0.8)
    OUT_PATH.write_text(
        json.dumps(
            {
                "source": "Basketball-Reference team per-game and advanced tables",
                "generatedFrom": "scripts/build_nba_team_season_stats.py",
                "seasons": by_season,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT_PATH} ({len(by_season)} seasons)")


if __name__ == "__main__":
    main()
