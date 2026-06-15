#!/usr/bin/env python3
"""Fetch traditional NBA player stats for a season from Basketball Reference."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

import pandas as pd
import requests

DEFAULT_SEASON = "2025-26"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "nba-stats"
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NBA-stats-export/1.0; +https://github.com/ballacademy/NBA-head-to-head-)",
    "Accept-Language": "en-US,en;q=0.9",
}

PER_GAME_COLUMNS = [
    "PLAYER_NAME",
    "BBR_PLAYER_ID",
    "TEAM_ABBREVIATION",
    "POSITION",
    "AGE",
    "GP",
    "GS",
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
    "STL",
    "BLK",
    "TOV",
    "PF",
    "PTS",
    "EFG_PCT",
]

TOTALS_COLUMNS = [
    "PLAYER_NAME",
    "BBR_PLAYER_ID",
    "TEAM_ABBREVIATION",
    "GP",
    "GS",
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
    "STL",
    "BLK",
    "TOV",
    "PF",
    "PTS",
]


def slugify_player_name(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    return slug


def season_end_year(season: str) -> int:
    start_year, end_suffix = season.split("-")
    return int(start_year[:2] + end_suffix)


def build_bbr_url(season: str, season_type: str, stat_mode: str) -> str:
    year = season_end_year(season)
    if season_type == "Playoffs":
        return f"https://www.basketball-reference.com/playoffs/NBA_{year}_{stat_mode}.html"
    if season_type != "Regular Season":
        raise ValueError(f"Unsupported season type for Basketball Reference: {season_type}")
    return f"https://www.basketball-reference.com/leagues/NBA_{year}_{stat_mode}.html"


def extract_bbr_player_ids(html: str) -> dict[str, str]:
    player_ids: dict[str, str] = {}
    pattern = re.compile(
        r'<a href="/players/[a-z]/([^"]+)\.html">([^<]+)</a>',
        re.IGNORECASE,
    )
    for player_id, player_name in pattern.findall(html):
        player_ids[player_name] = player_id
    return player_ids


def fetch_html(url: str, max_retries: int = 3, retry_delay_seconds: float = 3.0) -> str:
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            response = requests.get(url, headers=REQUEST_HEADERS, timeout=30)
            response.raise_for_status()
            response.encoding = "utf-8"
            return response.text
        except Exception as exc:  # noqa: BLE001 - retry on transient network failures
            last_error = exc
            if attempt < max_retries:
                time.sleep(retry_delay_seconds * attempt)

    raise RuntimeError(f"Failed to fetch {url} after {max_retries} attempts") from last_error


def parse_bbr_table(html: str) -> pd.DataFrame:
    table = pd.read_html(StringIO(html))[0]
    table.columns = [str(column) for column in table.columns]
    table = table[~table["Player"].astype(str).str.contains("Player", na=False)]
    table = table[table["Player"].notna()].copy()
    table = table.reset_index(drop=True)
    return table


def normalize_per_game(df: pd.DataFrame, player_ids: dict[str, str]) -> pd.DataFrame:
    normalized = pd.DataFrame(
        {
            "PLAYER_NAME": df["Player"],
            "BBR_PLAYER_ID": df["Player"].map(player_ids),
            "TEAM_ABBREVIATION": df["Team"],
            "POSITION": df.get("Pos"),
            "AGE": pd.to_numeric(df.get("Age"), errors="coerce"),
            "GP": pd.to_numeric(df.get("G"), errors="coerce"),
            "GS": pd.to_numeric(df.get("GS"), errors="coerce"),
            "MIN": pd.to_numeric(df.get("MP"), errors="coerce"),
            "FGM": pd.to_numeric(df.get("FG"), errors="coerce"),
            "FGA": pd.to_numeric(df.get("FGA"), errors="coerce"),
            "FG_PCT": pd.to_numeric(df.get("FG%"), errors="coerce"),
            "FG3M": pd.to_numeric(df.get("3P"), errors="coerce"),
            "FG3A": pd.to_numeric(df.get("3PA"), errors="coerce"),
            "FG3_PCT": pd.to_numeric(df.get("3P%"), errors="coerce"),
            "FTM": pd.to_numeric(df.get("FT"), errors="coerce"),
            "FTA": pd.to_numeric(df.get("FTA"), errors="coerce"),
            "FT_PCT": pd.to_numeric(df.get("FT%"), errors="coerce"),
            "OREB": pd.to_numeric(df.get("ORB"), errors="coerce"),
            "DREB": pd.to_numeric(df.get("DRB"), errors="coerce"),
            "REB": pd.to_numeric(df.get("TRB"), errors="coerce"),
            "AST": pd.to_numeric(df.get("AST"), errors="coerce"),
            "STL": pd.to_numeric(df.get("STL"), errors="coerce"),
            "BLK": pd.to_numeric(df.get("BLK"), errors="coerce"),
            "TOV": pd.to_numeric(df.get("TOV"), errors="coerce"),
            "PF": pd.to_numeric(df.get("PF"), errors="coerce"),
            "PTS": pd.to_numeric(df.get("PTS"), errors="coerce"),
            "EFG_PCT": pd.to_numeric(df.get("eFG%"), errors="coerce"),
        }
    )
    return normalized


def normalize_totals(df: pd.DataFrame, player_ids: dict[str, str]) -> pd.DataFrame:
    normalized = pd.DataFrame(
        {
            "PLAYER_NAME": df["Player"],
            "BBR_PLAYER_ID": df["Player"].map(player_ids),
            "TEAM_ABBREVIATION": df["Team"],
            "GP": pd.to_numeric(df.get("G"), errors="coerce"),
            "GS": pd.to_numeric(df.get("GS"), errors="coerce"),
            "MIN": pd.to_numeric(df.get("MP"), errors="coerce"),
            "FGM": pd.to_numeric(df.get("FG"), errors="coerce"),
            "FGA": pd.to_numeric(df.get("FGA"), errors="coerce"),
            "FG3M": pd.to_numeric(df.get("3P"), errors="coerce"),
            "FG3A": pd.to_numeric(df.get("3PA"), errors="coerce"),
            "FTM": pd.to_numeric(df.get("FT"), errors="coerce"),
            "FTA": pd.to_numeric(df.get("FTA"), errors="coerce"),
            "OREB": pd.to_numeric(df.get("ORB"), errors="coerce"),
            "DREB": pd.to_numeric(df.get("DRB"), errors="coerce"),
            "REB": pd.to_numeric(df.get("TRB"), errors="coerce"),
            "AST": pd.to_numeric(df.get("AST"), errors="coerce"),
            "STL": pd.to_numeric(df.get("STL"), errors="coerce"),
            "BLK": pd.to_numeric(df.get("BLK"), errors="coerce"),
            "TOV": pd.to_numeric(df.get("TOV"), errors="coerce"),
            "PF": pd.to_numeric(df.get("PF"), errors="coerce"),
            "PTS": pd.to_numeric(df.get("PTS"), errors="coerce"),
        }
    )
    return normalized


def fetch_player_stats(
    season: str,
    season_type: str = "Regular Season",
    max_retries: int = 3,
    retry_delay_seconds: float = 3.0,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    per_game_url = build_bbr_url(season, season_type, "per_game")
    totals_url = build_bbr_url(season, season_type, "totals")

    per_game_html = fetch_html(per_game_url, max_retries, retry_delay_seconds)
    time.sleep(2.0)
    totals_html = fetch_html(totals_url, max_retries, retry_delay_seconds)

    per_game_ids = extract_bbr_player_ids(per_game_html)
    totals_ids = extract_bbr_player_ids(totals_html)
    player_ids = {**totals_ids, **per_game_ids}

    per_game = normalize_per_game(parse_bbr_table(per_game_html), player_ids)
    totals = normalize_totals(parse_bbr_table(totals_html), player_ids)

    per_game = per_game[per_game["PLAYER_NAME"] != "League Average"].copy()
    totals = totals[totals["PLAYER_NAME"] != "League Average"].copy()

    return per_game, totals


def select_primary_player_rows(df: pd.DataFrame) -> pd.DataFrame:
    selected_rows: list[pd.Series] = []

    for _, group in df.groupby("PLAYER_NAME", sort=False):
        total_row = group[group["TEAM_ABBREVIATION"] == "TOT"]
        if not total_row.empty:
            selected_rows.append(total_row.iloc[0])
            continue

        single_team_rows = group[~group["TEAM_ABBREVIATION"].astype(str).str.contains("TM", na=False)]
        if single_team_rows.empty:
            selected_rows.append(group.sort_values("GP", ascending=False).iloc[0])
        else:
            selected_rows.append(single_team_rows.sort_values("GP", ascending=False).iloc[0])

    return pd.DataFrame(selected_rows).reset_index(drop=True)


def clean_frame(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    available = [column for column in columns if column in df.columns]
    cleaned = df[available].copy()
    cleaned = cleaned.sort_values(["PTS", "GP"], ascending=[False, False], kind="stable")
    cleaned = cleaned.reset_index(drop=True)
    return cleaned


def to_int(value: object, default: int = 0) -> int:
    if pd.isna(value):
        return default
    return int(float(value))


def to_float(value: object, default: float = 0.0) -> float:
    if pd.isna(value):
        return default
    return float(value)


def build_app_payload(per_game: pd.DataFrame, season: str, season_type: str) -> dict:
    players = []
    primary_rows = select_primary_player_rows(per_game)

    for row in primary_rows.itertuples(index=False):
        row_dict = row._asdict()
        player_name = str(row_dict["PLAYER_NAME"])
        fga = to_float(row_dict.get("FGA"))
        fta = to_float(row_dict.get("FTA"))
        pts = to_float(row_dict.get("PTS"))

        true_shooting = None
        if fga + 0.44 * fta > 0:
            true_shooting = round(pts / (2 * (fga + 0.44 * fta)), 3)

        bbr_player_id = row_dict.get("BBR_PLAYER_ID")
        player_id = bbr_player_id or slugify_player_name(player_name)

        players.append(
            {
                "id": player_id,
                "bbrPlayerId": bbr_player_id,
                "name": player_name,
                "team": row_dict.get("TEAM_ABBREVIATION"),
                "position": row_dict.get("POSITION"),
                "age": to_int(row_dict.get("AGE"), default=0) if pd.notna(row_dict.get("AGE")) else None,
                "gamesPlayed": to_int(row_dict.get("GP")),
                "gamesStarted": to_int(row_dict.get("GS")),
                "minutes": to_float(row_dict.get("MIN")),
                "points": to_float(row_dict.get("PTS")),
                "rebounds": to_float(row_dict.get("REB")),
                "assists": to_float(row_dict.get("AST")),
                "steals": to_float(row_dict.get("STL")),
                "blocks": to_float(row_dict.get("BLK")),
                "turnovers": to_float(row_dict.get("TOV")),
                "fieldGoalsMade": to_float(row_dict.get("FGM")),
                "fieldGoalsAttempted": fga,
                "fieldGoalPct": to_float(row_dict.get("FG_PCT")),
                "threePointersMade": to_float(row_dict.get("FG3M")),
                "threePointersAttempted": to_float(row_dict.get("FG3A")),
                "threePointPct": to_float(row_dict.get("FG3_PCT")),
                "freeThrowsMade": to_float(row_dict.get("FTM")),
                "freeThrowsAttempted": fta,
                "freeThrowPct": to_float(row_dict.get("FT_PCT")),
                "offensiveRebounds": to_float(row_dict.get("OREB")),
                "defensiveRebounds": to_float(row_dict.get("DREB")),
                "personalFouls": to_float(row_dict.get("PF")),
                "effectiveFieldGoalPct": to_float(row_dict.get("EFG_PCT")),
                "trueShooting": true_shooting,
            }
        )

    return {
        "season": season,
        "seasonType": season_type,
        "source": "basketball-reference",
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
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    with pd.ExcelWriter(spreadsheet_path, engine="openpyxl") as writer:
        per_game.to_excel(writer, sheet_name="Per Game", index=False)
        totals.to_excel(writer, sheet_name="Totals", index=False)
        select_primary_player_rows(per_game).to_excel(writer, sheet_name="Per Player", index=False)

        metadata = pd.DataFrame(
            [
                {"key": "season", "value": season},
                {"key": "seasonType", "value": season_type},
                {"key": "source", "value": "basketball-reference"},
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
        description="Download traditional NBA player stats from Basketball Reference."
    )
    parser.add_argument(
        "--season",
        default=DEFAULT_SEASON,
        help=f"NBA season in YYYY-YY format (default: {DEFAULT_SEASON})",
    )
    parser.add_argument(
        "--season-type",
        default="Regular Season",
        choices=["Regular Season", "Playoffs"],
        help="Season segment to fetch (default: Regular Season)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory for exported files",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    print(
        f"Fetching traditional player stats from Basketball Reference "
        f"for {args.season} ({args.season_type})..."
    )
    per_game_raw, totals_raw = fetch_player_stats(args.season, args.season_type)

    per_game = clean_frame(per_game_raw, PER_GAME_COLUMNS)
    totals = clean_frame(totals_raw, TOTALS_COLUMNS)

    paths = export_outputs(
        per_game,
        totals,
        args.output_dir,
        args.season,
        args.season_type,
    )

    print(f"Exported {len(select_primary_player_rows(per_game))} primary player rows:")
    print(f"  full per-game rows (includes team splits): {len(per_game)}")
    for label, path in paths.items():
        print(f"  {label}: {path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
