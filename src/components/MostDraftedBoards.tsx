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
    <section className="franchise-home__card landing-card" aria-label="Most drafted">
      <div className="franchise-home__card-head">
        <p className="franchise-home__eyebrow">Most drafted</p>
        <p className="franchise-home__lede">
          {mostDraftedMode
            ? MOST_DRAFTED_BOARD_LABELS[mostDraftedMode]
            : "Your most used players by mode"}
        </p>
      </div>

      {mostDraftedMode ? (
        <>
          <div className="franchise-home__card-actions">
            <button
              type="button"
              className="franchise-home__text-link"
              onClick={() => setMostDraftedMode(null)}
            >
              All modes
            </button>
          </div>
          {mostDraftedDetail.length === 0 ? (
            <p className="franchise-home__meta">
              No {MOST_DRAFTED_BOARD_LABELS[mostDraftedMode]} drafts yet.
            </p>
          ) : (
            <ol className="franchise-home__rank-list">
              {mostDraftedDetail.map((row, index) => (
                <li key={row.playerId} className="franchise-home__rank-row">
                  <span className="franchise-home__rank-index">{index + 1}.</span>
                  <span className="franchise-home__rank-name">{row.name}</span>
                  <span className="franchise-home__rank-meta">
                    {formatPersonalHitRateMeta(mostDraftedMode, row)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <div className="franchise-home__rows">
          {mostDraftedSummaries.map((board) => (
            <button
              key={board.mode}
              type="button"
              className="franchise-home__row"
              onClick={() => setMostDraftedMode(board.mode)}
            >
              <span className="franchise-home__row-copy">
                <strong>{board.label}</strong>
              </span>
              <span className="franchise-home__row-meta">
                {board.leaderName
                  ? `${board.leaderName} · ${board.leaderDrafts}`
                  : "No drafts yet"}
              </span>
              <span className="franchise-home__row-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
