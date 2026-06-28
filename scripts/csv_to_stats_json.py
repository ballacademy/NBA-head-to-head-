#!/usr/bin/env python3
"""Convert curated CSV files into the app's NBA player stats JSON format."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from fetch_nba_player_stats import (  # noqa: E402
    ADVANCED_COLUMNS,
    PER_GAME_COLUMNS,
    apply_position_override,
    build_app_payload,
    clean_frame,
    infer_positions_from_stats,
    optional_float,
    parse_position_string,
    parse_primary_position,
    row_dict_to_player_payload,
    to_float,
    to_int,
)

DEFAULT_STATS_PATH = (
    ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
)


def relative_repo_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT.resolve()))
    except ValueError:
        return str(path)

MANUAL_COLUMN_ALIASES: dict[str, str] = {
    "bbr_player_id": "BBR_PLAYER_ID",
    "bbrplayerid": "BBR_PLAYER_ID",
    "bbrPlayerId": "BBR_PLAYER_ID",
    "name": "PLAYER_NAME",
    "player_name": "PLAYER_NAME",
    "team": "TEAM_ABBREVIATION",
    "team_abbreviation": "TEAM_ABBREVIATION",
    "position": "POSITION",
    "age": "AGE",
    "games_played": "GP",
    "gamesPlayed": "GP",
    "games_started": "GS",
    "gamesStarted": "GS",
    "minutes": "MIN",
    "points": "PTS",
    "rebounds": "REB",
    "assists": "AST",
    "steals": "STL",
    "blocks": "BLK",
    "turnovers": "TOV",
    "field_goals_made": "FGM",
    "fieldGoalsMade": "FGM",
    "field_goals_attempted": "FGA",
    "fieldGoalsAttempted": "FGA",
    "field_goal_pct": "FG_PCT",
    "fieldGoalPct": "FG_PCT",
    "three_pointers_made": "FG3M",
    "threePointersMade": "FG3M",
    "three_pointers_attempted": "FG3A",
    "threePointersAttempted": "FG3A",
    "three_point_pct": "FG3_PCT",
    "threePointPct": "FG3_PCT",
    "free_throws_made": "FTM",
    "freeThrowsMade": "FTM",
    "free_throws_attempted": "FTA",
    "freeThrowsAttempted": "FTA",
    "free_throw_pct": "FT_PCT",
    "freeThrowPct": "FT_PCT",
    "offensive_rebounds": "OREB",
    "offensiveRebounds": "OREB",
    "defensive_rebounds": "DREB",
    "defensiveRebounds": "DREB",
    "personal_fouls": "PF",
    "personalFouls": "PF",
    "effective_field_goal_pct": "EFG_PCT",
    "effectiveFieldGoalPct": "EFG_PCT",
    "true_shooting": "TRUE_SHOOTING",
    "trueShooting": "TRUE_SHOOTING",
    "defensive_win_shares": "DWS",
    "defensiveWinShares": "DWS",
    "defensive_box_plus_minus": "DBPM",
    "defensiveBoxPlusMinus": "DBPM",
    "defensive_rebound_pct": "DRB_PCT",
    "defensiveReboundPct": "DRB_PCT",
    "steal_pct": "STL_PCT",
    "stealPct": "STL_PCT",
    "block_pct": "BLK_PCT",
    "blockPct": "BLK_PCT",
}

MANUAL_ADVANCED_KEYS = {
    "DWS": "defensiveWinShares",
    "DBPM": "defensiveBoxPlusMinus",
    "DRB_PCT": "defensiveReboundPct",
    "STL_PCT": "stealPct",
    "BLK_PCT": "blockPct",
}


def normalize_manual_columns(df: pd.DataFrame) -> pd.DataFrame:
    renamed: dict[str, str] = {}

    for column in df.columns:
        key = str(column).strip()
        if key in MANUAL_COLUMN_ALIASES:
            renamed[column] = MANUAL_COLUMN_ALIASES[key]
            continue

        upper = key.upper()
        if upper in PER_GAME_COLUMNS or upper in ADVANCED_COLUMNS:
            renamed[column] = upper

    return df.rename(columns=renamed)


def uses_manual_format(df: pd.DataFrame) -> bool:
    normalized = {str(column).strip() for column in df.columns}
    lowered = {column.lower() for column in normalized}
    return bool(
        normalized.intersection({"bbrPlayerId", "bbr_player_id"})
        or lowered.intersection({"bbrplayerid"})
        or "name" in lowered
        and "team" in lowered
        and "points" in lowered
    )


def read_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, keep_default_na=False).replace({"": pd.NA})


def manual_advanced_stats(row_dict: dict) -> dict[str, float | None]:
    advanced: dict[str, float | None] = {}
    for column, key in MANUAL_ADVANCED_KEYS.items():
        if column in row_dict and pd.notna(row_dict[column]):
            advanced[key] = optional_float(row_dict[column])
    return advanced


def build_manual_payload(
    per_game: pd.DataFrame,
    season: str,
    season_type: str,
    source: str,
    input_path: Path,
) -> dict:
    players: list[dict] = []

    for row in per_game.itertuples(index=False):
        row_dict = row._asdict()
        player_name = str(row_dict.get("PLAYER_NAME") or "").strip()
        bbr_player_id = str(row_dict.get("BBR_PLAYER_ID") or "").strip()
        team = str(row_dict.get("TEAM_ABBREVIATION") or "UNK").strip()

        if not player_name or not bbr_player_id:
            raise ValueError(
                "Manual CSV rows require name and bbr_player_id (or bbrPlayerId)."
            )

        primary = parse_primary_position(row_dict.get("POSITION"))
        listed_positions = parse_position_string(row_dict.get("POSITION"))
        resolved_positions = infer_positions_from_stats(
            primary,
            listed_positions or [primary],
            to_float(row_dict.get("AST")),
            to_float(row_dict.get("REB")),
            to_float(row_dict.get("BLK")),
        )
        resolved_positions = apply_position_override(bbr_player_id, resolved_positions)

        player = row_dict_to_player_payload(
            row_dict,
            team,
            manual_advanced_stats(row_dict),
            bbr_player_id,
            resolved_positions,
        )

        if "TRUE_SHOOTING" in row_dict and pd.notna(row_dict["TRUE_SHOOTING"]):
            player["trueShooting"] = to_float(row_dict["TRUE_SHOOTING"])

        players.append(player)

    players.sort(key=lambda player: (-player["points"], player["name"], player["team"]))

    return {
        "season": season,
        "seasonType": season_type,
        "source": source,
        "inputFile": relative_repo_path(input_path),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(players),
        "uniquePlayerCount": len(players),
        "players": players,
    }


def convert_csv_to_stats_json(
    input_path: Path,
    output_path: Path,
    *,
    season: str,
    season_type: str,
    advanced_csv: Path | None = None,
    source: str = "manual-curation",
) -> dict:
    per_game_raw = read_csv(input_path)
    per_game = normalize_manual_columns(per_game_raw)

    if uses_manual_format(per_game_raw):
        payload = build_manual_payload(
            per_game,
            season,
            season_type,
            source,
            input_path,
        )
    else:
        per_game = clean_frame(per_game, PER_GAME_COLUMNS)
        if advanced_csv:
            advanced = clean_frame(
                normalize_manual_columns(read_csv(advanced_csv)),
                ADVANCED_COLUMNS,
            )
        else:
            advanced = pd.DataFrame(columns=ADVANCED_COLUMNS)

        payload = build_app_payload(per_game, advanced, season, season_type)
        payload["source"] = source
        payload["inputFile"] = relative_repo_path(input_path)
        if advanced_csv:
            payload["advancedInputFile"] = relative_repo_path(advanced_csv)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return payload


def run_self_test() -> None:
    fixture = ROOT / "data" / "manual" / "fixtures" / "player-stats-mini.csv"
    output = ROOT / "data" / "manual" / "fixtures" / "player-stats-mini.out.json"

    payload = convert_csv_to_stats_json(
        fixture,
        output,
        season="2025-26",
        season_type="Regular Season",
        source="manual-curation-self-test",
    )

    assert payload["playerCount"] == 2
    assert payload["players"][0]["bbrPlayerId"] == "doncilu01"
    assert payload["players"][0]["points"] == 33.5
    assert payload["players"][1]["name"] == "Shai Gilgeous-Alexander"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert curated CSV into the app's NBA player stats JSON format."
    )
    parser.add_argument(
        "--input",
        type=Path,
        help="Input CSV path (Basketball Reference export or manual template format).",
    )
    parser.add_argument(
        "--advanced-csv",
        type=Path,
        help="Optional advanced-stats CSV when using Basketball Reference per-game columns.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_STATS_PATH,
        help=f"Output JSON path (default: {DEFAULT_STATS_PATH})",
    )
    parser.add_argument(
        "--season",
        default="2025-26",
        help="Season label stored in the JSON file (default: 2025-26).",
    )
    parser.add_argument(
        "--season-type",
        default="Regular Season",
        help="Season type label stored in the JSON file (default: Regular Season).",
    )
    parser.add_argument(
        "--source",
        default="manual-curation",
        help='Value for the JSON "source" field (default: manual-curation).',
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Run the built-in fixture conversion test and exit.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.self_test:
        run_self_test()
        print("csv_to_stats_json self-test passed.")
        return 0

    if not args.input:
        raise SystemExit("error: --input is required unless --self-test is used.")

    payload = convert_csv_to_stats_json(
        args.input,
        args.output,
        season=args.season,
        season_type=args.season_type,
        advanced_csv=args.advanced_csv,
        source=args.source,
    )

    print(
        f"Wrote {payload['playerCount']} players to {args.output} "
        f"from {args.input}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
