import { useMemo, useState } from "react";
import type { Player } from "../lib/types";
import type { SeasonStatsFile } from "../lib/playerPool";

interface PlayerStatsTableProps {
  players: Player[];
  statsFile: SeasonStatsFile;
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
  | "trueShooting";

const columns: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Player" },
  { key: "team", label: "Team" },
  { key: "position", label: "Pos" },
  { key: "points", label: "PTS" },
  { key: "rebounds", label: "REB" },
  { key: "assists", label: "AST" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
  { key: "trueShooting", label: "TS%" },
];

export function PlayerStatsTable({ players, statsFile }: PlayerStatsTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matches = normalizedQuery
      ? players.filter((player) => {
          const haystack = `${player.name} ${player.team} ${player.position}`.toLowerCase();
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
  }, [players, query, sortDirection, sortKey]);

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
      <div className="section-heading">
        <p className="eyebrow">2025-26 season stats</p>
        <h2 id="stats-heading">Browse the full player pool</h2>
        <p>
          These numbers power lineup scoring in the app. They come from Basketball
          Reference ({statsFile.uniquePlayerCount ?? statsFile.playerCount} unique
          players, {players.length} stat rows including team splits) and refresh
          when you rerun the Python export script.
        </p>
      </div>

      <div className="stats-meta">
        <span>Season: {statsFile.season}</span>
        <span>Updated: {new Date(statsFile.generatedAt).toLocaleString()}</span>
        <span>Source: {statsFile.source}</span>
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
            {filteredPlayers.map((player) => (
              <tr key={player.id}>
                <td>{player.name}</td>
                <td>{player.team}</td>
                <td>{player.position}</td>
                <td>{player.points.toFixed(1)}</td>
                <td>{player.rebounds.toFixed(1)}</td>
                <td>{player.assists.toFixed(1)}</td>
                <td>{player.steals.toFixed(1)}</td>
                <td>{player.blocks.toFixed(1)}</td>
                <td>{(player.trueShooting * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="stats-footnote">
        Showing {filteredPlayers.length} of {players.length} players.
      </p>
    </section>
  );
}
