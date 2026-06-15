#!/usr/bin/env python3
"""Fetch traditional NBA player stats for a season using nba_api."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from nba_api.library.http import NBAHTTP
from nba_api.stats.endpoints import LeagueDashPlayerStats
from nba_api.stats.library.parameters import SeasonTypeAllStar

DEFAULT_SEASON = "2025-26"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "nba-stats"

NBA_REQUEST_HEADERS = {
    "Host": "stats.nba.com",
    "Connection": "keep-alive",
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
}

PER_GAME_COLUMNS = [
    "PLAYER_ID",
    "PLAYER_NAME",
    "TEAM_ID",
    "TEAM_ABBREVIATION",
    "AGE",
    "GP",
    "W",
    "L",
    "W_PCT",
    "MIN",
    "FGM",
    "FGA",
    "FG_PCT",
    "FG3M",
    "FG3A",
    "FG3_PCT",
    "FTM",
    "FTA",
    "FT_PCT",
    "OREB",
    "DREB",
    "REB",
    "AST",
    "TOV",
    "STL",
    "BLK",
    "BLKA",
    "PF",
    "PFD",
    "PTS",
    "PLUS_MINUS",
    "NBA_FANTASY_PTS",
    "DD2",
    "TD3",
]

TOTALS_COLUMNS = [
    "PLAYER_ID",
    "PLAYER_NAME",
    "TEAM_ID",
    "TEAM_ABBREVIATION",
    "GP",
    "MIN",
    "FGM",
    "FGA",
    "FG3M",
    "FG3A",
    "FTM",
    "FTA",
    "OREB",
    "DREB",
    "REB",
    "AST",
    "TOV",
    "STL",
    "BLK",
    "PF",
    "PTS",
    "PLUS_MINUS",
]


def slugify_player_name(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    return slug


def clear_nba_session() -> None:
    session = NBAHTTP._session
    if session is not None:
        session.close()
    NBAHTTP._session = None


def fetch_player_stats(
    season: str,
    season_type: str = SeasonTypeAllStar.regular,
    max_retries: int = 3,
    retry_delay_seconds: float = 2.0,
    timeout_seconds: int = 90,
    proxy: str | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            clear_nba_session()

            request_kwargs = {
                "season": season,
                "season_type_all_star": season_type,
                "measure_type_detailed_defense": "Base",
                "headers": NBA_REQUEST_HEADERS,
                "timeout": timeout_seconds,
            }
            if proxy:
                request_kwargs["proxy"] = proxy

            per_game = LeagueDashPlayerStats(
                per_mode_detailed="PerGame",
                **request_kwargs,
            ).get_data_frames()[0]

            time.sleep(0.6)
            clear_nba_session()

            totals = LeagueDashPlayerStats(
                per_mode_detailed="Totals",
                **request_kwargs,
            ).get_data_frames()[0]

            return per_game, totals
        except Exception as exc:  # noqa: BLE001 - retry on transient API failures
            last_error = exc
            clear_nba_session()
            if attempt < max_retries:
                time.sleep(retry_delay_seconds * attempt)

    raise RuntimeError(
        f"Failed to fetch stats for {season} after {max_retries} attempts"
    ) from last_error


def clean_frame(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    available = [column for column in columns if column in df.columns]
    cleaned = df[available].copy()
    cleaned = cleaned.sort_values(["PTS", "GP"], ascending=[False, False], kind="stable")
    cleaned = cleaned.reset_index(drop=True)
    return cleaned


def build_app_payload(per_game: pd.DataFrame, season: str, season_type: str) -> dict:
    players = []

    for row in per_game.itertuples(index=False):
        row_dict = row._asdict()
        player_name = str(row_dict["PLAYER_NAME"])
        fga = float(row_dict.get("FGA") or 0)
        fta = float(row_dict.get("FTA") or 0)
        pts = float(row_dict.get("PTS") or 0)
        fgm = float(row_dict.get("FGM") or 0)
        fg3m = float(row_dict.get("FG3M") or 0)

        true_shooting = None
        if fga + 0.44 * fta > 0:
            true_shooting = round(pts / (2 * (fga + 0.44 * fta)), 3)

        players.append(
            {
                "id": slugify_player_name(player_name),
                "playerId": int(row_dict["PLAYER_ID"]),
                "name": player_name,
                "team": row_dict.get("TEAM_ABBREVIATION"),
                "teamId": int(row_dict["TEAM_ID"]) if pd.notna(row_dict.get("TEAM_ID")) else None,
                "age": int(row_dict["AGE"]) if pd.notna(row_dict.get("AGE")) else None,
                "gamesPlayed": int(row_dict.get("GP") or 0),
                "minutes": float(row_dict.get("MIN") or 0),
                "points": float(row_dict.get("PTS") or 0),
                "rebounds": float(row_dict.get("REB") or 0),
                "assists": float(row_dict.get("AST") or 0),
                "steals": float(row_dict.get("STL") or 0),
                "blocks": float(row_dict.get("BLK") or 0),
                "turnovers": float(row_dict.get("TOV") or 0),
                "fieldGoalsMade": fgm,
                "fieldGoalsAttempted": fga,
                "fieldGoalPct": float(row_dict.get("FG_PCT") or 0),
                "threePointersMade": fg3m,
                "threePointersAttempted": float(row_dict.get("FG3A") or 0),
                "threePointPct": float(row_dict.get("FG3_PCT") or 0),
                "freeThrowsMade": float(row_dict.get("FTM") or 0),
                "freeThrowsAttempted": fta,
                "freeThrowPct": float(row_dict.get("FT_PCT") or 0),
                "offensiveRebounds": float(row_dict.get("OREB") or 0),
                "defensiveRebounds": float(row_dict.get("DREB") or 0),
                "personalFouls": float(row_dict.get("PF") or 0),
                "plusMinus": float(row_dict.get("PLUS_MINUS") or 0),
                "trueShooting": true_shooting,
                "doubleDoubles": int(row_dict.get("DD2") or 0),
                "tripleDoubles": int(row_dict.get("TD3") or 0),
            }
        )

    return {
        "season": season,
        "seasonType": season_type,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(players),
        "players": players,
    }


def export_outputs(
    per_game: pd.DataFrame,
    totals: pd.DataFrame,
    output_dir: Path,
    season: str,
    season_type: str,
) -> dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)

    season_slug = season.replace("-", "")
    season_type_slug = season_type.lower().replace(" ", "-")

    per_game_path = output_dir / f"nba-player-stats-{season_slug}-{season_type_slug}-per-game.csv"
    totals_path = output_dir / f"nba-player-stats-{season_slug}-{season_type_slug}-totals.csv"
    json_path = output_dir / f"nba-player-stats-{season_slug}-{season_type_slug}.json"
    spreadsheet_path = output_dir / f"nba-player-stats-{season_slug}-{season_type_slug}.xlsx"

    per_game.to_csv(per_game_path, index=False)
    totals.to_csv(totals_path, index=False)

    payload = build_app_payload(per_game, season, season_type)
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    with pd.ExcelWriter(spreadsheet_path, engine="openpyxl") as writer:
        per_game.to_excel(writer, sheet_name="Per Game", index=False)
        totals.to_excel(writer, sheet_name="Totals", index=False)

        metadata = pd.DataFrame(
            [
                {"key": "season", "value": season},
                {"key": "seasonType", "value": season_type},
                {"key": "generatedAt", "value": payload["generatedAt"]},
                {"key": "playerCount", "value": payload["playerCount"]},
            ]
        )
        metadata.to_excel(writer, sheet_name="Metadata", index=False)

    return {
        "per_game_csv": per_game_path,
        "totals_csv": totals_path,
        "json": json_path,
        "spreadsheet": spreadsheet_path,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download traditional NBA player stats for a season."
    )
    parser.add_argument(
        "--season",
        default=DEFAULT_SEASON,
        help=f"NBA season in YYYY-YY format (default: {DEFAULT_SEASON})",
    )
    parser.add_argument(
        "--season-type",
        default=SeasonTypeAllStar.regular,
        choices=[
            SeasonTypeAllStar.regular,
            SeasonTypeAllStar.playoffs,
            SeasonTypeAllStar.preseason,
        ],
        help="Season segment to fetch (default: Regular Season)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory for exported files",
    )
    parser.add_argument(
        "--proxy",
        default=None,
        help="Optional HTTP/HTTPS proxy URL (required on some cloud hosts)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=90,
        help="Request timeout in seconds",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    print(f"Fetching traditional player stats for {args.season} ({args.season_type})...")
    per_game_raw, totals_raw = fetch_player_stats(
        args.season,
        args.season_type,
        timeout_seconds=args.timeout,
        proxy=args.proxy,
    )

    per_game = clean_frame(per_game_raw, PER_GAME_COLUMNS)
    totals = clean_frame(totals_raw, TOTALS_COLUMNS)

    paths = export_outputs(
        per_game,
        totals,
        args.output_dir,
        args.season,
        args.season_type,
    )

    print(f"Exported {len(per_game)} players:")
    for label, path in paths.items():
        print(f"  {label}: {path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
