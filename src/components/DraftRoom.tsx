import { useEffect, useMemo, useState } from "react";
import {
  filterPlayersForSlot,
  formatPickSlotSummary,
  formatSlotConstraint,
  sortDraftCandidates,
} from "../lib/draft";
import { PlayerDraftStats } from "./PlayerDraftStats";
import { getPlayerPickShineClass } from "../lib/draftPickStyle";
import { PICK_TIME_LIMIT_SECONDS } from "../lib/match";
import { formatPlayerPositions, playersById } from "../lib/playerPool";
import { loadPlayerRecord } from "../lib/playerRecord";
import type { Drafter, Player } from "../lib/types";
import { PlayerRarityBadge } from "./PlayerRarityBadge";
import { LimitedSampleBadge } from "./LimitedSampleBadge";
import { PlayerTeamIcon } from "./PlayerTeamIcon";
import { TeamNameWithStreak } from "./TeamNameWithStreak";

interface DraftRoomProps {
  drafter: Drafter;
  players: Player[];
  activeStep: number;
  isDailyDraft?: boolean;
  dailyChallengeTitle?: string;
  dailyChallengeDescription?: string;
  onPick: (slot: number, playerId: string) => void;
  onTimeout: (slot: number) => void;
}

export function DraftRoom({
  drafter,
  players,
  activeStep,
  isDailyDraft = false,
  dailyChallengeTitle,
  dailyChallengeDescription,
  onPick,
  onTimeout,
}: DraftRoomProps) {
  const [query, setQuery] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(PICK_TIME_LIMIT_SECONDS);

  const currentSlot = drafter.draftSlots[activeStep];
  const playerRecord = loadPlayerRecord();
  const pickedIds = useMemo(
    () =>
      new Set(
        drafter.lineup.filter((playerId): playerId is string =>
          Boolean(playerId),
        ),
      ),
    [drafter.lineup],
  );
  const completedPicks = useMemo(
    () =>
      drafter.lineup
        .map((playerId, index) => {
          const player = playersById.get(playerId);
          const slot = drafter.draftSlots[index];

          if (!player || !slot) {
            return undefined;
          }

          return {
            index,
            player,
            slot,
          };
        })
        .filter(
          (
            pick,
          ): pick is {
            index: number;
            player: Player;
            slot: (typeof drafter.draftSlots)[number];
          } => Boolean(pick),
        ),
    [drafter.draftSlots, drafter.lineup],
  );

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
  const totalPicks = drafter.draftSlots.length;

  return (
    <section
      className="panel draft-room draft-room--focused"
      aria-labelledby="draft-heading"
    >
      {isDailyDraft && dailyChallengeTitle ? (
        <div className="daily-draft-banner" role="status">
          <p className="eyebrow">Daily Draft</p>
          <h3>{dailyChallengeTitle}</h3>
          {dailyChallengeDescription ? (
            <p>{dailyChallengeDescription}</p>
          ) : null}
        </div>
      ) : null}

      <div className="draft-page-header">
        <p className="eyebrow">
          <TeamNameWithStreak
            city={drafter.city}
            name={drafter.name}
            winStreak={playerRecord.winStreak}
            lossStreak={playerRecord.lossStreak}
          />{" "}
          • Pick {activeStep + 1} of {totalPicks}
        </p>
        <h2 id="draft-heading">Draft player {activeStep + 1}</h2>
        <p className="draft-page-header__copy">
          Your next requirement is revealed only when you reach this pick.
        </p>
      </div>

      <div
        className="draft-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalPicks}
        aria-valuenow={activeStep + 1}
        aria-label={`Draft progress, pick ${activeStep + 1} of ${totalPicks}`}
      >
        {Array.from({ length: totalPicks }, (_, index) => {
          const status =
            index < activeStep
              ? "complete"
              : index === activeStep
                ? "active"
                : "upcoming";

          return (
            <span
              key={`draft-progress-${index}`}
              className={`draft-progress__step draft-progress__step--${status}`}
            />
          );
        })}
      </div>

      {completedPicks.length > 0 ? (
        <section className="draft-picks-so-far" aria-label="Your picks so far">
          <p className="eyebrow">Your picks so far</p>
          <ol className="draft-picks-so-far__list">
            {completedPicks.map(({ index, player, slot }) => (
              <li key={player.id}>
                <PlayerTeamIcon
                  team={player.team}
                  position={player.position}
                  jerseyNumber={player.jerseyNumber}
                  showJersey
                  label={`${player.name}, pick ${index + 1}`}
                />
                <div>
                  <div className="player-pick__title-row">
                    <strong>{player.name}</strong>
                    <PlayerRarityBadge player={player} />
                  </div>
                  <span>
                    {formatPickSlotSummary(slot)} • {player.team}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

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
            const shineClass = getPlayerPickShineClass(player);

            return (
              <button
                type="button"
                key={player.id}
                className={`player-pick${shineClass ? ` ${shineClass}` : ""}`}
                onClick={() => {
                  onPick(activeStep, player.id);
                  setQuery("");
                }}
              >
                <PlayerTeamIcon
                  team={player.team}
                  position={player.position}
                  jerseyNumber={player.jerseyNumber}
                  showJersey
                  label={player.name}
                />
                <div>
                  <div className="player-pick__title-row">
                    <strong>{player.name}</strong>
                    <span className="player-pick__badges">
                      <LimitedSampleBadge player={player} />
                      <PlayerRarityBadge player={player} />
                    </span>
                  </div>
                  <span className="player-pick__team">
                    {player.team} • {formatPlayerPositions(player.positions)}
                  </span>
                  <PlayerDraftStats player={player} />
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
