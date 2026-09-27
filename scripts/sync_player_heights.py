#!/usr/bin/env python3
"""Fetch real player heights from Basketball Reference team rosters.

Writes:
  - data/nba-player-heights.json (bbrPlayerId → heightInches)
  - merges heightInches onto players in the season stats JSON

Usage:
  python3 scripts/sync_player_heights.py
  python3 scripts/sync_player_heights.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
HEIGHTS_PATH = ROOT / "data" / "nba-player-heights.json"

# BBR season-end years to scrape. Prefer newer when both list a player.
DEFAULT_SEASON_YEARS = (2027, 2026)

BBR_TEAMS = [
    "ATL",
    "BOS",
    "BRK",
    "CHO",
    "CHI",
    "CLE",
    "DAL",
    "DEN",
    "DET",
    "GSW",
    "HOU",
    "IND",
    "LAC",
    "LAL",
    "MEM",
    "MIA",
    "MIL",
    "MIN",
    "NOP",
    "NYK",
    "OKC",
    "ORL",
    "PHI",
    "PHO",
    "POR",
    "SAC",
    "SAS",
    "TOR",
    "UTA",
    "WAS",
]

USER_AGENT = "DraftDayGMHeightSync/1.0 (+https://www.draftdaygm.com)"
REQUEST_GAP_SECONDS = 0.7

PLAYER_HEIGHT_RE = re.compile(
    r'href="/players/[a-z]/([a-z0-9]+)\.html"[^>]*>([^<]+)</a>'
    r'.*?data-stat="height"[^>]*>([^<]*)</td>',
    re.S | re.I,
)
PLAYER_PAGE_HEIGHT_RE = re.compile(r">\s*(\d-\d{1,2})\s*<")


def parse_height_to_inches(raw: str) -> int | None:
    value = raw.strip()
    if not value or value in {"", "&nbsp;"}:
        return None
    match = re.fullmatch(r"(\d+)-(\d{1,2})", value)
    if not match:
        return None
    feet = int(match.group(1))
    inches = int(match.group(2))
    if feet <= 0 or inches < 0 or inches >= 12:
        return None
    return feet * 12 + inches


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read().decode("utf-8", errors="replace")


def uncomment_html(html: str) -> str:
    """BBR often wraps tables in HTML comments; expose them for parsing."""
    return re.sub(r"<!--|-->", "", html)


def scrape_team_roster(team: str, season_year: int) -> dict[str, dict[str, object]]:
    url = f"https://www.basketball-reference.com/teams/{team}/{season_year}.html"
    try:
        html = uncomment_html(fetch_text(url))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return {}
        raise

    found: dict[str, dict[str, object]] = {}
    for match in PLAYER_HEIGHT_RE.finditer(html):
        bbr_id = match.group(1)
        name = match.group(2).strip()
        height_inches = parse_height_to_inches(match.group(3))
        if height_inches is None:
            continue
        found[bbr_id] = {
            "name": name,
            "heightInches": height_inches,
            "team": team,
            "seasonYear": season_year,
        }
    return found


def scrape_player_page(bbr_id: str) -> int | None:
    if not bbr_id or len(bbr_id) < 2:
        return None
    url = f"https://www.basketball-reference.com/players/{bbr_id[0]}/{bbr_id}.html"
    try:
        html = fetch_text(url)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise

    # Prefer the first feet-inches token near the bio block.
    for match in PLAYER_PAGE_HEIGHT_RE.finditer(html):
        height_inches = parse_height_to_inches(match.group(1))
        if height_inches is not None and 60 <= height_inches <= 96:
            return height_inches
    return None


def merge_heights(
    existing: dict[str, dict[str, object]],
    incoming: dict[str, dict[str, object]],
) -> int:
    added = 0
    for bbr_id, row in incoming.items():
        prior = existing.get(bbr_id)
        if prior is None:
            existing[bbr_id] = row
            added += 1
            continue
        prior_year = int(prior.get("seasonYear") or 0)
        new_year = int(row.get("seasonYear") or 0)
        if new_year >= prior_year:
            existing[bbr_id] = row
    return added


def load_stats_bbr_ids(path: Path) -> list[tuple[str, str]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows: list[tuple[str, str]] = []
    seen: set[str] = set()
    for player in payload.get("players", []):
        bbr_id = str(player.get("bbrPlayerId") or "").strip()
        if not bbr_id or bbr_id in seen:
            continue
        seen.add(bbr_id)
        rows.append((bbr_id, str(player.get("name") or bbr_id)))
    return rows


def apply_heights_to_stats(
    stats_path: Path,
    heights: dict[str, dict[str, object]],
) -> tuple[int, int]:
    payload = json.loads(stats_path.read_text(encoding="utf-8"))
    updated = 0
    missing = 0
    for player in payload.get("players", []):
        bbr_id = str(player.get("bbrPlayerId") or "").strip()
        entry = heights.get(bbr_id) if bbr_id else None
        if entry and isinstance(entry.get("heightInches"), int):
            if player.get("heightInches") != entry["heightInches"]:
                player["heightInches"] = entry["heightInches"]
                updated += 1
            else:
                player["heightInches"] = entry["heightInches"]
        else:
            missing += 1
            player.pop("heightInches", None)

    stats_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return updated, missing


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync NBA player heights from BBR.")
    parser.add_argument(
        "--season-years",
        type=int,
        nargs="+",
        default=list(DEFAULT_SEASON_YEARS),
        help="BBR season-end years to scrape (newer preferred).",
    )
    parser.add_argument(
        "--fill-missing-player-pages",
        action="store_true",
        help="For stats-pool players still missing, fetch individual BBR pages.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape and report without writing files.",
    )
    parser.add_argument(
        "--no-stats-merge",
        action="store_true",
        help="Only write nba-player-heights.json; do not patch the stats JSON.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    heights: dict[str, dict[str, object]] = {}

    # Scrape older seasons first, then newer so newer overwrites.
    for season_year in sorted(args.season_years):
        print(f"Scraping BBR team rosters for {season_year - 1}-{str(season_year)[2:]}...")
        for index, team in enumerate(BBR_TEAMS, start=1):
            rows = scrape_team_roster(team, season_year)
            added = merge_heights(heights, rows)
            print(f"  [{index:02d}/30] {team}: {len(rows)} heights ({added} new)")
            time.sleep(REQUEST_GAP_SECONDS)

    pool_players = load_stats_bbr_ids(STATS_PATH)
    missing_ids = [bbr_id for bbr_id, _ in pool_players if bbr_id not in heights]
    print(f"After team rosters: {len(heights)} unique heights; {len(missing_ids)} pool players missing")

    if args.fill_missing_player_pages and missing_ids:
        print(f"Filling {len(missing_ids)} missing heights from player pages...")
        for index, bbr_id in enumerate(missing_ids, start=1):
            height_inches = scrape_player_page(bbr_id)
            time.sleep(REQUEST_GAP_SECONDS)
            if height_inches is None:
                continue
            name = next(name for bid, name in pool_players if bid == bbr_id)
            heights[bbr_id] = {
                "name": name,
                "heightInches": height_inches,
                "team": "FA",
                "seasonYear": max(args.season_years),
                "source": "player-page",
            }
            if index % 25 == 0 or index == len(missing_ids):
                print(f"  player pages {index}/{len(missing_ids)}")

    by_player = {
        bbr_id: {
            "name": row["name"],
            "heightInches": row["heightInches"],
            "team": row.get("team"),
            "seasonYear": row.get("seasonYear"),
            **(
                {"source": row["source"]}
                if row.get("source")
                else {}
            ),
        }
        for bbr_id, row in sorted(heights.items())
    }

    payload = {
        "description": "NBA player heights (inches) synced from Basketball Reference rosters.",
        "source": "basketball-reference-rosters",
        "seasonYears": sorted(args.season_years),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(by_player),
        "byPlayerId": by_player,
    }

    wemby = by_player.get("wembavi01")
    if wemby:
        print(f"Wembanyama: {wemby['heightInches']} in ({wemby['heightInches'] // 12}'{wemby['heightInches'] % 12}\")")

    tallest = max(by_player.values(), key=lambda row: int(row["heightInches"]))
    print(
        f"Tallest synced: {tallest['name']} "
        f"({int(tallest['heightInches']) // 12}'{int(tallest['heightInches']) % 12}\")"
    )

    if args.dry_run:
        print("Dry run — no files written.")
        return 0

    HEIGHTS_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(by_player)} heights to {HEIGHTS_PATH.relative_to(ROOT)}")

    if not args.no_stats_merge:
        updated, missing = apply_heights_to_stats(STATS_PATH, by_player)
        print(
            f"Merged heights into stats JSON "
            f"({updated} players set/changed; {missing} still missing)"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
