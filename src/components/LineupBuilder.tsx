import { useMemo, useState } from "react";
import {
  autoDraftLineup,
  filterPlayersForSlot,
  formatSlotConstraint,
  sortDraftCandidates,
} from "../lib/draft";
import { playersById } from "../lib/playerPool";
import type { Drafter, Player } from "../lib/types";

interface LineupBuilderProps {
  drafters: Drafter[];
  players: Player[];
  activeDrafterId: string;
  onActiveDrafterChange: (drafterId: string) => void;
  onPick: (slot: number, playerId: string) => void;
  onAutoDraft: () => void;
  onNewDraft: () => void;
  onStepChange: (step: number) => void;
  activeStep: number;
}

export function LineupBuilder({
  drafters,
  players,
  activeDrafterId,
  onActiveDrafterChange,
  onPick,
  onAutoDraft,
  onNewDraft,
  onStepChange,
  activeStep,
}: LineupBuilderProps) {
  const [query, setQuery] = useState("");
  const activeDrafter = drafters.find(
    (drafter) => drafter.id === activeDrafterId,
  );

  const currentSlot = activeDrafter?.draftSlots[activeStep];
  const pickedIds = useMemo(
    () => new Set(activeDrafter?.lineup ?? []),
    [activeDrafter?.lineup],
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

  if (!activeDrafter || !currentSlot) {
    return null;
  }

  const isComplete = activeDrafter.lineup.length >= activeDrafter.draftSlots.length;
  const selectedPlayer = activeDrafter.lineup[activeStep]
    ? playersById.get(activeDrafter.lineup[activeStep])
    : undefined;

  return (
    <section className="panel lineup-builder" aria-labelledby="draft-heading">
      <div className="section-heading">
        <p className="eyebrow">Create a lineup</p>
        <h2 id="draft-heading">Draft five players</h2>
        <p>
          Each pick is locked to a random position and division. Work through
          all five steps to complete your lineup.
        </p>
      </div>

      <label className="field">
        <span>Drafter</span>
        <select
          value={activeDrafterId}
          onChange={(event) => {
            setQuery("");
            onActiveDrafterChange(event.target.value);
          }}
        >
          {drafters.map((drafter) => (
            <option key={drafter.id} value={drafter.id}>
              {drafter.name} - {drafter.city}
            </option>
          ))}
        </select>
      </label>

      <ol className="draft-steps" aria-label="Draft progress">
        {activeDrafter.draftSlots.map((slot, index) => {
          const player = activeDrafter.lineup[index]
            ? playersById.get(activeDrafter.lineup[index])
            : undefined;
          const isActive = index === activeStep;

          return (
            <li key={`${slot.position}-${slot.division}-${index}`}>
              <button
                type="button"
                className={
                  isActive
                    ? "draft-step active"
                    : player
                      ? "draft-step complete"
                      : "draft-step"
                }
                onClick={() => {
                  setQuery("");
                  onStepChange(index);
                }}
              >
                <span className="draft-step__label">Pick {index + 1}</span>
                <strong>{formatSlotConstraint(slot)}</strong>
                <small>{player ? player.name : "Open"}</small>
              </button>
            </li>
          );
        })}
      </ol>

      {isComplete && activeStep === activeDrafter.draftSlots.length - 1 ? (
        <div className="draft-complete">
          <p>Lineup complete. Review your five or start a new draft board.</p>
          <button className="secondary-button" type="button" onClick={onNewDraft}>
            New random draft board
          </button>
        </div>
      ) : (
        <>
          <div className="draft-prompt">
            <p className="eyebrow">Pick {activeStep + 1} of 5</p>
            <h3>{formatSlotConstraint(currentSlot)}</h3>
            <p>
              {candidates.length} eligible players available
              {selectedPlayer ? ` • Current: ${selectedPlayer.name}` : ""}
            </p>
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
              candidates.map((player) => (
                <button
                  type="button"
                  key={player.id}
                  className={
                    activeDrafter.lineup[activeStep] === player.id
                      ? "player-pick selected"
                      : "player-pick"
                  }
                  onClick={() => {
                    onPick(activeStep, player.id);
                    setQuery("");
                  }}
                >
                  <div>
                    <strong>{player.name}</strong>
                    <span>
                      {player.team} • {player.points.toFixed(1)} PTS •{" "}
                      {(player.trueShooting * 100).toFixed(1)}% TS
                    </span>
                  </div>
                  <span className="player-pick__cta">Draft</span>
                </button>
              ))
            ) : (
              <p className="draft-empty">
                No players match this position and division. Try a new draft
                board or use auto-draft.
              </p>
            )}
          </div>

          <div className="draft-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={activeStep === 0}
              onClick={() => onStepChange(activeStep - 1)}
            >
              Back
            </button>
            <button className="secondary-button" type="button" onClick={onAutoDraft}>
              Auto-fill remaining picks
            </button>
            <button className="secondary-button" type="button" onClick={onNewDraft}>
              New random draft board
            </button>
          </div>
        </>
      )}
    </section>
  );
}
