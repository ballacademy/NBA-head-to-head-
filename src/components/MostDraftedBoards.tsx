import { useMemo, useState } from "react";
import { players as allPlayers } from "../data/players";
import {
  canShowMostDraftedBoards,
  formatPersonalHitRateMeta,
  getMostDraftedNbaPlayersForMode,
  MOST_DRAFTED_BOARD_LABELS,
  type MostDraftedBoardMode,
} from "../lib/nbaPlayerUsage";

const MOST_DRAFTED_MODES: MostDraftedBoardMode[] = [
  "headToHead",
  "ranked",
  "daily",
  "event",
];

interface MostDraftedBoardsProps {
  /** Refresh when parent remounts or counters change. */
  refreshKey?: number;
}

export function MostDraftedBoards({ refreshKey = 0 }: MostDraftedBoardsProps) {
  const [mostDraftedMode, setMostDraftedMode] =
    useState<MostDraftedBoardMode | null>(null);

  const nameById = useMemo(
    () => new Map(allPlayers.map((player) => [player.id, player.name])),
    [],
  );

  const showMostDrafted = useMemo(
    () => canShowMostDraftedBoards(),
    [refreshKey],
  );

  const mostDraftedSummaries = useMemo(() => {
    if (!showMostDrafted) {
      return [];
    }
    return MOST_DRAFTED_MODES.map((mode) => {
      const top = getMostDraftedNbaPlayersForMode(mode, 10);
      const leader = top[0] ?? null;
      return {
        mode,
        label: MOST_DRAFTED_BOARD_LABELS[mode],
        leaderName: leader
          ? (nameById.get(leader.playerId) ?? leader.playerId)
          : null,
        leaderDrafts: leader?.drafts ?? 0,
      };
    });
  }, [nameById, refreshKey, showMostDrafted]);

  const mostDraftedDetail = useMemo(() => {
    if (!mostDraftedMode) {
      return [];
    }
    return getMostDraftedNbaPlayersForMode(mostDraftedMode, 10).map((row) => ({
      ...row,
      name: nameById.get(row.playerId) ?? row.playerId,
    }));
  }, [mostDraftedMode, nameById, refreshKey]);

  if (!showMostDrafted) {
    return null;
  }

  return (
    <section className="gm-stats-page__section franchise-home__most-drafted">
      <div className="gm-stats-page__section-heading">
        <h2>
          {mostDraftedMode
            ? `Most drafted · ${MOST_DRAFTED_BOARD_LABELS[mostDraftedMode]}`
            : "Most drafted"}
        </h2>
        {mostDraftedMode ? (
          <button
            type="button"
            className="gm-stats-page__section-back"
            onClick={() => setMostDraftedMode(null)}
          >
            All modes
          </button>
        ) : null}
      </div>

      {mostDraftedMode ? (
        mostDraftedDetail.length === 0 ? (
          <p className="gm-stats-page__section-copy">
            No {MOST_DRAFTED_BOARD_LABELS[mostDraftedMode]} drafts yet.
          </p>
        ) : (
          <ol className="gm-stats-page__most-drafted">
            {mostDraftedDetail.map((row, index) => (
              <li key={row.playerId} className="gm-stats-page__most-drafted-row">
                <span className="gm-stats-page__most-drafted-rank">
                  {index + 1}.
                </span>
                <span className="gm-stats-page__most-drafted-name">
                  {row.name}
                </span>
                <span className="gm-stats-page__most-drafted-meta">
                  {formatPersonalHitRateMeta(mostDraftedMode, row)}
                </span>
              </li>
            ))}
          </ol>
        )
      ) : (
        <div className="gm-stats-page__most-drafted-boards">
          {mostDraftedSummaries.map((board) => (
            <button
              key={board.mode}
              type="button"
              className="gm-stats-page__most-drafted-board"
              onClick={() => setMostDraftedMode(board.mode)}
            >
              <span className="gm-stats-page__most-drafted-board-label">
                {board.label}
              </span>
              <span className="gm-stats-page__most-drafted-board-meta">
                {board.leaderName
                  ? `${board.leaderName} · ${board.leaderDrafts}`
                  : "No drafts yet"}
              </span>
              <span
                className="gm-stats-page__most-drafted-board-chevron"
                aria-hidden="true"
              >
                ›
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
