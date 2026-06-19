import { useMemo, useState } from "react";
import { getDefenseGrade } from "../lib/defenseGrade";
import {
  ensurePlayerCollection,
  isPlayerStatsMasked,
  type PlayerCollection,
} from "../lib/playerCollection";
import type { Player } from "../lib/types";

interface PlayerStatsTableProps {
  players: Player[];
  collection?: PlayerCollection;
  onBack: () => void;
}

type SortKey =
  | "name"
  | "team"
  | "position"
  | "points"
  | "rebounds"
  | "assists"
  | "steals"
  | "blocks"
  | "threePoint"
  | "trueShooting"
  | "defense";

const MASKED_VALUE = "????";

const columns: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Player" },
  { key: "team", label: "Team" },
  { key: "position", label: "Pos" },
  { key: "points", label: "PTS" },
  { key: "rebounds", label: "REB" },
  { key: "assists", label: "AST" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
  { key: "threePoint", label: "3P%" },
  { key: "trueShooting", label: "TS%" },
  { key: "defense", label: "DEF" },
];

export function PlayerStatsTable({
  players,
  collection = ensurePlayerCollection(),
  onBack,
}: PlayerStatsTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matches = normalizedQuery
      ? players.filter((player) => {
          if (isPlayerStatsMasked(player, collection)) {
            return false;
          }

          const haystack =
            `${player.name} ${player.team} ${player.position}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : players;

    return [...matches].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];

      if (typeof left === "string" && typeof right === "string") {
        return sortDirection === "asc"
          ? left.localeCompare(right)
          : right.localeCompare(left);
      }

      const numericLeft = Number(left);
      const numericRight = Number(right);
      return sortDirection === "asc"
        ? numericLeft - numericRight
        : numericRight - numericLeft;
    });
  }, [collection, players, query, sortDirection, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "name" || key === "team" || key === "position" ? "asc" : "desc");
  };

  return (
    <section className="panel stats-panel" aria-labelledby="stats-heading">
      <div className="stats-panel__header">
        <div className="section-heading">
          <p className="eyebrow">2025-26 season stats</p>
          <h2 id="stats-heading">Browse the full player pool</h2>
          <p>
            These numbers power lineup scoring in the app. Locked stars and scrubs
            stay hidden until you unlock them. Everyone else is visible here.
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={onBack}>
          Back to home
        </button>
      </div>

      <div className="stats-file-note">
        <strong>Spreadsheet on your PC:</strong> after running the fetch script,
        open{" "}
        <code>data\nba-stats\nba-player-stats-202526-regular-season.xlsx</code>{" "}
        in Excel. The in-app table below is the same data, searchable in your
        browser.
      </div>

      <label className="field stats-search">
        <span>Search players</span>
        <input
          type="search"
          value={query}
          placeholder="Search by name, team, or position"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="stats-table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button
                    type="button"
                    className={
                      sortKey === column.key ? "sort-button active" : "sort-button"
                    }
                    onClick={() => toggleSort(column.key)}
                  >
                    {column.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => {
              const masked = isPlayerStatsMasked(player, collection);

              return (
                <tr
                  key={player.id}
                  className={masked ? "stats-table__row--masked" : undefined}
                >
                  <td>{masked ? MASKED_VALUE : player.name}</td>
                  <td>{masked ? MASKED_VALUE : player.team}</td>
                  <td>{masked ? MASKED_VALUE : player.position}</td>
                  <td>{masked ? MASKED_VALUE : player.points.toFixed(1)}</td>
                  <td>{masked ? MASKED_VALUE : player.rebounds.toFixed(1)}</td>
                  <td>{masked ? MASKED_VALUE : player.assists.toFixed(1)}</td>
                  <td>{masked ? MASKED_VALUE : player.steals.toFixed(1)}</td>
                  <td>{masked ? MASKED_VALUE : player.blocks.toFixed(1)}</td>
                  <td>
                    {masked ? MASKED_VALUE : `${(player.threePoint * 100).toFixed(1)}%`}
                  </td>
                  <td>
                    {masked ? MASKED_VALUE : `${(player.trueShooting * 100).toFixed(1)}%`}
                  </td>
                  <td>
                    {masked
                      ? MASKED_VALUE
                      : getDefenseGrade(player.defense, player.defenseGrade)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="stats-footnote">
        Showing {filteredPlayers.length} of {players.length} players.
      </p>
    </section>
  );
}
