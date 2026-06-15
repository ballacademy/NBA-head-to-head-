import { useEffect, useMemo, useState } from "react";
import {
  filterPlayersForSlot,
  formatSlotConstraint,
  sortDraftCandidates,
} from "../lib/draft";
import { formatPlayerDraftStats } from "../lib/defenseGrade";
import { PICK_TIME_LIMIT_SECONDS } from "../lib/match";
import { playersById } from "../lib/playerPool";
import type { Drafter, Player } from "../lib/types";

interface DraftRoomProps {
  drafter: Drafter;
  players: Player[];
  activeStep: number;
  onPick: (slot: number, playerId: string) => void;
  onTimeout: (slot: number) => void;
}

export function DraftRoom({
  drafter,
  players,
  activeStep,
  onPick,
  onTimeout,
}: DraftRoomProps) {
  const [query, setQuery] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(PICK_TIME_LIMIT_SECONDS);

  const currentSlot = drafter.draftSlots[activeStep];
  const pickedIds = useMemo(() => new Set(drafter.lineup), [drafter.lineup]);

  const candidates = useMemo(() => {
    if (!currentSlot) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const filtered = sortDraftCandidates(
      filterPlayersForSlot(players, currentSlot, pickedIds),
    );

    if (!normalizedQuery) {
      return filtered;
    }

    return filtered.filter((player) =>
      `${player.name} ${player.team}`.toLowerCase().includes(normalizedQuery),
    );
  }, [currentSlot, pickedIds, players, query]);

  useEffect(() => {
    setQuery("");
    setSecondsLeft(PICK_TIME_LIMIT_SECONDS);
  }, [activeStep, currentSlot?.division, currentSlot?.position]);

  useEffect(() => {
    if (!currentSlot || drafter.lineup.length >= drafter.draftSlots.length) {
      return;
    }

    if (drafter.lineup[activeStep]) {
      return;
    }

    if (secondsLeft <= 0) {
      onTimeout(activeStep);
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    activeStep,
    currentSlot,
    drafter.draftSlots.length,
    drafter.lineup,
    onTimeout,
    secondsLeft,
  ]);

  if (!currentSlot) {
    return null;
  }

  const timerClass =
    secondsLeft <= 5 ? "draft-timer urgent" : "draft-timer";

  return (
    <section className="panel draft-room" aria-labelledby="draft-heading">
      <div className="section-heading">
        <p className="eyebrow">Your draft</p>
        <h2 id="draft-heading">Draft your players</h2>
        <p>
          Pick {activeStep + 1} of 5. Only you can see your board until the
          matchup is ready.
        </p>
      </div>

      <ol className="draft-steps" aria-label="Your draft progress">
        {drafter.draftSlots.map((slot, index) => {
          const player = drafter.lineup[index]
            ? playersById.get(drafter.lineup[index])
            : undefined;
          const isActive = index === activeStep;

          return (
            <li key={`${slot.position}-${slot.division}-${index}`}>
              <div
                className={
                  isActive
                    ? "draft-step active"
                    : player
                      ? "draft-step complete"
                      : "draft-step"
                }
              >
                <span className="draft-step__label">Pick {index + 1}</span>
                <strong>{formatSlotConstraint(slot)}</strong>
                <small>{player ? player.name : "Open"}</small>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="draft-prompt">
        <div className="draft-prompt__header">
          <div>
            <p className="eyebrow">On the clock</p>
            <h3>{formatSlotConstraint(currentSlot)}</h3>
          </div>
          <div className={timerClass} aria-live="polite">
            <span>{secondsLeft}s</span>
            <small>left</small>
          </div>
        </div>
        <p>{candidates.length} eligible players available</p>
      </div>

      <label className="field stats-search">
        <span>Search eligible players</span>
        <input
          type="search"
          value={query}
          placeholder="Search by name or team"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="player-pick-list" role="listbox" aria-label="Eligible players">
        {candidates.length > 0 ? (
          candidates.map((player) => {
            const stats = formatPlayerDraftStats(player);

            return (
              <button
                type="button"
                key={player.id}
                className="player-pick"
                onClick={() => {
                  onPick(activeStep, player.id);
                  setQuery("");
                }}
              >
                <div>
                  <strong>{player.name}</strong>
                  <span className="player-pick__team">
                    {player.team} • {player.position}
                  </span>
                  <span className="player-pick__stats">{stats.summary}</span>
                </div>
              </button>
            );
          })
        ) : (
          <p className="draft-empty">
            No eligible players for this slot. Time will run out and the pick
            will be skipped.
          </p>
        )}
      </div>
    </section>
  );
}
