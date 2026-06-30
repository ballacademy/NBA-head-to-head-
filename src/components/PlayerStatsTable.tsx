import { useMemo, useState } from "react";
import { comparePositions } from "../lib/positions";
import { getDefenseGrade } from "../lib/defenseGrade";
import {
  ensurePlayerCollection,
  getUnlockedPlayerClassLabel,
  isPlayerStatsMasked,
  type PlayerCollection,
} from "../lib/playerCollection";
import {
  comparePlayersForTeamColumn,
  getPlayerTeamLabel,
  getPlayerTeamSearchText,
} from "../lib/freeAgents";
import { statsFile } from "../lib/playerPool";
import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "../lib/allStars";
import { isScrubPlayer, isSuperScrubPlayer } from "../lib/playerTiers";
import { ModeCardInfo } from "./ModeCardInfo";
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

const getPriorSeasonLabel = (season: string) => {
  const match = season.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return "the previous NBA season";
  }

  const startYear = Number(match[1]);
  return `${startYear - 1}-${String(startYear).padStart(2, "0")}`;
};

const getUnlockedPlayerClassBadgeClass = (player: Player) => {
  if (isSuperstarPlayer(player)) {
    return "player-rarity-badge player-rarity-badge--superstar";
  }

  if (isAllStarPlayer(player)) {
    return "player-rarity-badge player-rarity-badge--all-star";
  }

  if (isRecentAllStarPlayer(player)) {
    return "player-rarity-badge player-rarity-badge--recent-all-star";
  }

  if (isSuperScrubPlayer(player)) {
    return "player-rarity-badge player-rarity-badge--super-scrub";
  }

  if (isScrubPlayer(player)) {
    return "player-rarity-badge player-rarity-badge--scrub";
  }

  return "stats-table__class stats-table__class--na";
};

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

  const statsInfoDetails = useMemo(
    () => [
      "Locked stars and scrubs stay hidden until you unlock them. Everyone else is visible here.",
      `Per-game stats reflect the ${statsFile.season} regular season where available. Players who did not play in ${statsFile.season} are graded using their ${getPriorSeasonLabel(statsFile.season)} season instead.`,
    ],
    [],
  );

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matches = normalizedQuery
      ? players.filter((player) => {
          if (isPlayerStatsMasked(player, collection)) {
            return false;
          }

          const haystack =
            `${player.name} ${getPlayerTeamSearchText(player)} ${player.position}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : players;

    return [...matches].sort((a, b) => {
      if (sortKey === "team") {
        return comparePlayersForTeamColumn(a, b, sortDirection);
      }

      if (sortKey === "position") {
        const comparison = comparePositions(a.position, b.position);
        return sortDirection === "asc" ? comparison : -comparison;
      }

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
    <section className="panel stats-panel feature-page feature-page--stats" aria-labelledby="stats-heading">
      <div className="stats-panel__header">
        <div className="section-heading stats-panel__heading">
          <p className="eyebrow">Season stats</p>
          <div className="stats-panel__title-row">
            <h2 id="stats-heading">Browse the player pool</h2>
            <ModeCardInfo
              details={statsInfoDetails}
              variant="corner"
              popoverAlign="start"
              ariaLabel="Season stats details"
            />
          </div>
        </div>
        <button type="button" className="secondary-button" onClick={onBack}>
          Back to home
        </button>
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
                  <td>
                    {masked ? (
                      MASKED_VALUE
                    ) : (
                      <span className="stats-table__player">
                        <span
                          className="stats-table__player-name"
                          title={player.name}
                        >
                          {player.name}
                        </span>
                        {collection.unlockedIds.includes(player.id) ? (
                          <span className={getUnlockedPlayerClassBadgeClass(player)}>
                            {getUnlockedPlayerClassLabel(player)}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </td>
                  <td>{masked ? MASKED_VALUE : getPlayerTeamLabel(player)}</td>
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
