#!/usr/bin/env python3
"""Build the app's salary JSON from a manually curated CSV file."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT_PATH = ROOT / "data" / "manual" / "nba-salaries.csv"
DEFAULT_SUPPLEMENTS_PATH = ROOT / "data" / "manual" / "nba-salary-supplements.csv"
DEFAULT_VOIDED_PATH = ROOT / "data" / "manual" / "nba-voided-contracts.csv"
DEFAULT_OUTPUT_PATH = ROOT / "data" / "nba-salaries-202627.json"
DEFAULT_STATS_PATH = (
    ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
)

SALARY_ID_COLUMNS = ("bbr_player_id", "bbrPlayerId", "bbrplayerid")
SALARY_VALUE_COLUMNS = ("salary_usd", "salary", "salaryUsd", "salary_usd_2026_27")
NAME_COLUMNS = ("name", "player_name", "playerName")
NOTES_COLUMNS = ("notes", "note", "comment")
VOIDED_ID_COLUMNS = ("bbr_id", "bbr_player_id", "bbrPlayerId")
VOIDED_REASON_COLUMNS = ("reason", "notes", "note")


def relative_repo_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT.resolve()))
    except ValueError:
        return str(path)


def normalize_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.strip().lower())


def resolve_column(fieldnames: list[str], candidates: tuple[str, ...]) -> str | None:
    normalized = {normalize_header(name): name for name in fieldnames}
    for candidate in candidates:
        match = normalized.get(normalize_header(candidate))
        if match:
            return match
    return None


def parse_salary(value: str) -> int:
    cleaned = str(value or "").strip().replace("$", "").replace(",", "")
    if not cleaned:
        raise ValueError("salary value is empty")

    salary = int(float(cleaned))
    if salary < 0:
        raise ValueError(f"salary must be non-negative, got {salary}")
    return salary


def load_stats_pool(stats_path: Path) -> set[str]:
    payload = json.loads(stats_path.read_text(encoding="utf-8"))
    pool: set[str] = set()

    for player in payload.get("players", []):
        bbr_player_id = player.get("bbrPlayerId")
        if bbr_player_id:
            pool.add(str(bbr_player_id))

    return pool


def read_salary_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError(f"{path} is missing a header row.")

        id_column = resolve_column(reader.fieldnames, SALARY_ID_COLUMNS)
        salary_column = resolve_column(reader.fieldnames, SALARY_VALUE_COLUMNS)

        if not id_column or not salary_column:
            raise ValueError(
                f"{path} must include bbr_player_id and salary_usd columns."
            )

        name_column = resolve_column(reader.fieldnames, NAME_COLUMNS)
        notes_column = resolve_column(reader.fieldnames, NOTES_COLUMNS)
        rows: list[dict[str, str]] = []

        for line_number, row in enumerate(reader, start=2):
            bbr_player_id = str(row.get(id_column) or "").strip()
            salary_raw = str(row.get(salary_column) or "").strip()

            if not bbr_player_id and not salary_raw:
                continue

            if not bbr_player_id:
                raise ValueError(f"{path}:{line_number}: missing bbr_player_id.")
            if not salary_raw:
                raise ValueError(f"{path}:{line_number}: missing salary for {bbr_player_id}.")

            rows.append(
                {
                    "bbr_player_id": bbr_player_id,
                    "salary_usd": salary_raw,
                    "name": str(row.get(name_column) or "").strip() if name_column else "",
                    "notes": str(row.get(notes_column) or "").strip() if notes_column else "",
                }
            )

    return rows


def read_voided_contract_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()

    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError(f"{path} is missing a header row.")

        id_column = resolve_column(reader.fieldnames, VOIDED_ID_COLUMNS)
        if not id_column:
            raise ValueError(f"{path} must include a bbr_id or bbr_player_id column.")

        voided_ids: set[str] = set()
        for line_number, row in enumerate(reader, start=2):
            bbr_player_id = str(row.get(id_column) or "").strip()
            if not bbr_player_id:
                continue
            voided_ids.add(bbr_player_id)

    return voided_ids


def build_salary_payload(
    rows: list[dict[str, str]],
    *,
    season: str,
    input_path: Path,
    stats_pool: set[str] | None = None,
    supplement_rows: list[dict[str, str]] | None = None,
    voided_ids: set[str] | None = None,
) -> dict:
    salaries: dict[str, int] = {}
    duplicates: list[str] = []
    excluded_voided: list[str] = []

    def apply_rows(source_rows: list[dict[str, str]], *, overwrite: bool) -> None:
        for row in source_rows:
            bbr_player_id = row["bbr_player_id"]
            if voided_ids and bbr_player_id in voided_ids:
                excluded_voided.append(bbr_player_id)
                continue
            if stats_pool is not None and bbr_player_id not in stats_pool:
                continue

            salary = parse_salary(row["salary_usd"])
            if bbr_player_id in salaries and salaries[bbr_player_id] != salary:
                duplicates.append(bbr_player_id)
            if overwrite or bbr_player_id not in salaries:
                salaries[bbr_player_id] = salary

    apply_rows(rows, overwrite=True)
    if supplement_rows:
        apply_rows(supplement_rows, overwrite=False)

    if duplicates:
        joined = ", ".join(sorted(set(duplicates)))
        raise ValueError(f"Conflicting salaries for: {joined}")

    sources = [relative_repo_path(input_path)]
    if supplement_rows:
        sources.append(relative_repo_path(DEFAULT_SUPPLEMENTS_PATH))

    return {
        "season": season,
        "source": "manual-curation",
        "inputFile": sources[0],
        "supplementsFile": sources[1] if len(sources) > 1 else None,
        "voidedContractsFile": (
            relative_repo_path(DEFAULT_VOIDED_PATH)
            if voided_ids
            else None
        ),
        "voidedPlayerCount": len(voided_ids or ()),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(salaries),
        "salaries": dict(sorted(salaries.items())),
        "_excludedVoided": sorted(set(excluded_voided)),
    }


def export_salary_csv(
    *,
    output_path: Path,
    salaries_json: Path,
    stats_pool: Path | None = None,
) -> int:
    payload = json.loads(salaries_json.read_text(encoding="utf-8"))
    salaries: dict[str, int] = payload.get("salaries", {})
    stats_ids = load_stats_pool(stats_pool) if stats_pool else None

    rows: list[tuple[str, str, int, str]] = []
    for bbr_player_id, salary in salaries.items():
        if stats_ids is not None and bbr_player_id not in stats_ids:
            continue
        rows.append((bbr_player_id, "", salary, ""))

    rows.sort(key=lambda row: (-row[2], row[0]))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["bbr_player_id", "name", "salary_usd", "notes"])
        writer.writerows(rows)

    return len(rows)


def warn_missing_pool_salaries(
    salaries: dict[str, int],
    stats_path: Path,
    *,
    min_games_played: int,
) -> list[str]:
    payload = json.loads(stats_path.read_text(encoding="utf-8"))
    missing: list[str] = []

    for player in payload.get("players", []):
        games_played = int(player.get("gamesPlayed") or 0)
        if games_played < min_games_played:
            continue

        bbr_player_id = str(player.get("bbrPlayerId") or "")
        if bbr_player_id and bbr_player_id not in salaries:
            missing.append(f"{player.get('name')} ({bbr_player_id})")

    return missing


def run_self_test() -> None:
    fixture = ROOT / "data" / "manual" / "fixtures" / "nba-salaries-mini.csv"
    output = ROOT / "data" / "manual" / "fixtures" / "nba-salaries-mini.out.json"

    rows = read_salary_rows(fixture)
    payload = build_salary_payload(
        rows,
        season="2026-27",
        input_path=fixture,
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    assert payload["playerCount"] == 2
    assert payload["salaries"]["doncilu01"] == 49_800_000
    assert payload["salaries"]["gilgesh01"] == 40_806_150


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build salary JSON from a manually curated CSV file."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT_PATH,
        help=f"Salary CSV path (default: {DEFAULT_INPUT_PATH})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help=f"Output JSON path (default: {DEFAULT_OUTPUT_PATH})",
    )
    parser.add_argument(
        "--supplements",
        type=Path,
        default=DEFAULT_SUPPLEMENTS_PATH,
        help=(
            "Optional supplemental salary CSV for recent signings not yet in "
            f"the main file (default: {DEFAULT_SUPPLEMENTS_PATH})."
        ),
    )
    parser.add_argument(
        "--no-supplements",
        action="store_true",
        help="Skip loading the supplemental salary CSV.",
    )
    parser.add_argument(
        "--voided",
        type=Path,
        default=DEFAULT_VOIDED_PATH,
        help=(
            "Optional CSV of voided/declined contracts to exclude from output "
            f"(default: {DEFAULT_VOIDED_PATH})."
        ),
    )
    parser.add_argument(
        "--no-voided",
        action="store_true",
        help="Skip loading the voided contracts CSV.",
    )
    parser.add_argument(
        "--season",
        default="2026-27",
        help="Salary season label stored in the JSON file (default: 2026-27).",
    )
    parser.add_argument(
        "--stats-pool",
        type=Path,
        help=(
            "Only keep salaries for bbr_player_id values present in this stats JSON. "
            "Recommended for draft-pool maintenance."
        ),
    )
    parser.add_argument(
        "--warn-missing-pool",
        action="store_true",
        help=(
            "After building, warn about stats-pool players with enough games played "
            "who still lack a salary row."
        ),
    )
    parser.add_argument(
        "--min-games-played",
        type=int,
        default=20,
        help="Games-played threshold used with --warn-missing-pool (default: 20).",
    )
    parser.add_argument(
        "--export-csv",
        type=Path,
        help="Export an editable CSV from an existing salary JSON file, then exit.",
    )
    parser.add_argument(
        "--from-json",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Salary JSON used by --export-csv (default: current output file).",
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
        print("csv_to_salaries_json self-test passed.")
        return 0

    if args.export_csv:
        count = export_salary_csv(
            output_path=args.export_csv,
            salaries_json=args.from_json,
            stats_pool=args.stats_pool,
        )
        print(f"Exported {count} salary rows to {args.export_csv}")
        return 0

    rows = read_salary_rows(args.input)
    supplement_rows = None
    if not args.no_supplements and args.supplements.exists():
        supplement_rows = read_salary_rows(args.supplements)
    voided_ids = None
    if not args.no_voided and args.voided.exists():
        voided_ids = read_voided_contract_ids(args.voided)
    stats_pool = load_stats_pool(args.stats_pool) if args.stats_pool else None
    payload = build_salary_payload(
        rows,
        season=args.season,
        input_path=args.input,
        stats_pool=stats_pool,
        supplement_rows=supplement_rows,
        voided_ids=voided_ids,
    )

    excluded_voided = payload.pop("_excludedVoided", [])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(
        f"Wrote {payload['playerCount']} salaries to {args.output} "
        f"from {args.input}"
    )
    if excluded_voided:
        preview = ", ".join(excluded_voided[:8])
        suffix = " ..." if len(excluded_voided) > 8 else ""
        print(
            f"Excluded {len(excluded_voided)} voided contract(s): "
            f"{preview}{suffix}"
        )

    if args.warn_missing_pool:
        if not args.stats_pool:
            raise SystemExit("error: --warn-missing-pool requires --stats-pool.")
        missing = warn_missing_pool_salaries(
            payload["salaries"],
            args.stats_pool,
            min_games_played=args.min_games_played,
        )
        if missing:
            preview = ", ".join(missing[:12])
            suffix = " ..." if len(missing) > 12 else ""
            print(
                f"Warning: {len(missing)} pool players with "
                f">= {args.min_games_played} GP lack salaries: {preview}{suffix}"
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
