#!/usr/bin/env python3
"""Apply curated free-agent signings to salaries, teams, and stats."""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIGNINGS_PATH = ROOT / "data" / "manual" / "nba-free-agent-signings.csv"
SALARIES_PATH = ROOT / "data" / "manual" / "nba-salaries.csv"
SUPPLEMENTS_PATH = ROOT / "data" / "manual" / "nba-salary-supplements.csv"
STATS_PATH = ROOT / "data" / "nba-stats" / "nba-player-stats-202526-regular-season.json"
OVERRIDES_PATH = ROOT / "data" / "nba-current-teams.json"
JERSEY_SYNC = ROOT / "scripts" / "sync_jersey_teams.py"
SALARY_BUILD = ROOT / "scripts" / "csv_to_salaries_json.py"

ID_COLUMNS = ("bbr_player_id", "bbrPlayerId")
SALARY_COLUMNS = ("salary_usd", "salary")
NAME_COLUMNS = ("name", "player_name")
TEAM_COLUMNS = ("team",)
NOTES_COLUMNS = ("notes", "note")


def normalize_header(value: str) -> str:
    return "".join(char for char in value.strip().lower() if char.isalnum())


def resolve_column(fieldnames: list[str], candidates: tuple[str, ...]) -> str | None:
    normalized = {normalize_header(name): name for name in fieldnames}
    for candidate in candidates:
        match = normalized.get(normalize_header(candidate))
        if match:
            return match
    return None


def read_csv_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError(f"{path} is missing a header row.")
        rows = [dict(row) for row in reader]
        return list(reader.fieldnames), rows


def write_csv_rows(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def upsert_salary_row(
    path: Path,
    *,
    bbr_player_id: str,
    salary_usd: int,
    name: str,
    notes: str,
) -> str:
    fieldnames, rows = read_csv_rows(path)
    id_column = resolve_column(fieldnames, ID_COLUMNS)
    salary_column = resolve_column(fieldnames, SALARY_COLUMNS)
    name_column = resolve_column(fieldnames, NAME_COLUMNS)
    notes_column = resolve_column(fieldnames, NOTES_COLUMNS)

    if not id_column or not salary_column:
        raise ValueError(f"{path} must include bbr_player_id and salary_usd columns.")

    updated = False
    for row in rows:
        if str(row.get(id_column) or "").strip() == bbr_player_id:
            row[salary_column] = str(salary_usd)
            if name_column and name:
                row[name_column] = name
            if notes_column and notes:
                row[notes_column] = notes
            updated = True
            break

    if not updated:
        new_row = {column: "" for column in fieldnames}
        new_row[id_column] = bbr_player_id
        new_row[salary_column] = str(salary_usd)
        if name_column:
            new_row[name_column] = name
        if notes_column:
            new_row[notes_column] = notes
        rows.append(new_row)

    write_csv_rows(path, fieldnames, rows)
    return "main" if path == SALARIES_PATH else "supplements"


def load_signings(path: Path) -> list[dict[str, str]]:
    fieldnames, rows = read_csv_rows(path)
    id_column = resolve_column(fieldnames, ID_COLUMNS)
    salary_column = resolve_column(fieldnames, SALARY_COLUMNS)
    name_column = resolve_column(fieldnames, NAME_COLUMNS)
    team_column = resolve_column(fieldnames, TEAM_COLUMNS)
    notes_column = resolve_column(fieldnames, NOTES_COLUMNS)

    if not id_column or not salary_column:
        raise ValueError(f"{path} must include bbr_player_id and salary_usd columns.")

    signings: list[dict[str, str]] = []
    for line_number, row in enumerate(rows, start=2):
        bbr_player_id = str(row.get(id_column) or "").strip()
        salary_raw = str(row.get(salary_column) or "").strip()
        if not bbr_player_id:
            continue
        if not salary_raw:
            raise ValueError(f"{path}:{line_number}: missing salary for {bbr_player_id}.")

        signings.append(
            {
                "bbr_player_id": bbr_player_id,
                "salary_usd": str(int(float(salary_raw.replace(",", "").replace("$", "")))),
                "name": str(row.get(name_column) or "").strip() if name_column else "",
                "team": str(row.get(team_column) or "").strip().upper() if team_column else "",
                "notes": str(row.get(notes_column) or "").strip() if notes_column else "",
            }
        )

    return signings


def salary_target_for_player(bbr_player_id: str) -> Path:
    if not SALARIES_PATH.exists():
        return SUPPLEMENTS_PATH

    fieldnames, rows = read_csv_rows(SALARIES_PATH)
    id_column = resolve_column(fieldnames, ID_COLUMNS)
    if not id_column:
        return SUPPLEMENTS_PATH

    for row in rows:
        if str(row.get(id_column) or "").strip() == bbr_player_id:
            return SALARIES_PATH

    return SUPPLEMENTS_PATH


def update_stats_team(bbr_player_id: str, team: str) -> bool:
    payload = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    changed = False

    for player in payload.get("players", []):
        if str(player.get("bbrPlayerId") or "") != bbr_player_id:
            continue
        if team and str(player.get("team") or "") != team:
            player["team"] = team
            player["id"] = f"{bbr_player_id}-{team.lower()}"
            changed = True
        break

    if changed:
        STATS_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    return changed


def update_team_override(bbr_player_id: str, team: str) -> bool:
    payload = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    overrides = payload.setdefault("overrides", {})
    if not team:
        return False

    if overrides.get(bbr_player_id) == team:
        return False

    overrides[bbr_player_id] = team
    payload["updatedAt"] = datetime.now(timezone.utc).isoformat()
    OVERRIDES_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return True


def run_jersey_sync() -> None:
    subprocess.run([sys.executable, str(JERSEY_SYNC)], check=True)


def run_salary_build() -> None:
    subprocess.run(
        [
            sys.executable,
            str(SALARY_BUILD),
            "--input",
            str(SALARIES_PATH),
            "--output",
            str(ROOT / "data" / "nba-salaries-202627.json"),
            "--season",
            "2026-27",
            "--stats-pool",
            str(STATS_PATH),
            "--warn-missing-pool",
        ],
        check=True,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply curated free-agent signings from a CSV tracker."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=SIGNINGS_PATH,
        help=f"Signings CSV path (default: {SIGNINGS_PATH})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned updates without writing files.",
    )
    parser.add_argument(
        "--no-build",
        action="store_true",
        help="Skip rebuilding nba-salaries-202627.json.",
    )
    parser.add_argument(
        "--no-jerseys",
        action="store_true",
        help="Skip syncing jersey team tags after team updates.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    signings = load_signings(args.input)

    salary_updates: list[str] = []
    team_updates: list[str] = []

    for signing in signings:
        bbr_player_id = signing["bbr_player_id"]
        salary_usd = int(signing["salary_usd"])
        name = signing["name"]
        team = signing["team"]
        notes = signing["notes"]

        target = salary_target_for_player(bbr_player_id)
        label = "main" if target == SALARIES_PATH else "supplements"
        salary_updates.append(f"{bbr_player_id}: ${salary_usd:,} -> {label}")

        if team:
            team_updates.append(f"{bbr_player_id}: {team}")

        if args.dry_run:
            continue

        upsert_salary_row(
            target,
            bbr_player_id=bbr_player_id,
            salary_usd=salary_usd,
            name=name,
            notes=notes,
        )

        if team:
            update_stats_team(bbr_player_id, team)
            update_team_override(bbr_player_id, team)

    if args.dry_run:
        print(f"Would apply {len(signings)} signing(s).")
        for line in salary_updates:
            print(f"  salary {line}")
        for line in team_updates:
            print(f"  team {line}")
        return 0

    if team_updates and not args.no_jerseys:
        run_jersey_sync()

    if not args.no_build:
        run_salary_build()

    print(f"Applied {len(signings)} signing(s).")
    if salary_updates:
        print("Salaries:")
        for line in salary_updates:
            print(f"  {line}")
    if team_updates:
        print("Teams:")
        for line in team_updates:
            print(f"  {line}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
