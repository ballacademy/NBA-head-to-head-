import {
  isEligibleForSlot,
  POSITION_NAMES,
  type SlotGrant,
} from "../lib/draft";
import type { Drafter, ResolvedPlayer } from "../lib/types";

interface LineupBuilderProps {
  drafters: Drafter[];
  players: ResolvedPlayer[];
  board: SlotGrant[];
  activeDrafterId: string;
  onActiveDrafterChange: (drafterId: string) => void;
  onPick: (slot: number, playerId: string) => void;
  onAutoDraft: () => void;
  onShuffleBoard: () => void;
}

const conferenceName = (conference: SlotGrant["conference"]) =>
  conference === "East" ? "Eastern" : "Western";

export function LineupBuilder({
  drafters,
  players,
  board,
  activeDrafterId,
  onActiveDrafterChange,
  onPick,
  onAutoDraft,
  onShuffleBoard,
}: LineupBuilderProps) {
  const activeDrafter = drafters.find(
    (drafter) => drafter.id === activeDrafterId,
  );

  if (!activeDrafter) {
    return null;
  }

  const selected = new Set(activeDrafter.lineup.filter(Boolean));

  return (
    <section className="panel lineup-builder" aria-labelledby="draft-heading">
      <div className="section-heading">
        <p className="eyebrow">Create a lineup</p>
        <h2 id="draft-heading">Draft five players</h2>
        <p>
          Each slot grants a random division and position. Pick any eligible
          player from that conference — boards lean balanced, but repeats happen.
        </p>
      </div>

      <div className="builder-controls">
        <label className="field">
          <span>Drafter</span>
          <select
            value={activeDrafterId}
            onChange={(event) => onActiveDrafterChange(event.target.value)}
          >
            {drafters.map((drafter) => (
              <option key={drafter.id} value={drafter.id}>
                {drafter.name} - {drafter.city}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={onShuffleBoard}
        >
          Shuffle draft board
        </button>
      </div>

      <div className="slots">
        {board.map((grant, index) => {
          const currentId = activeDrafter.lineup[index] ?? "";
          const options = players.filter(
            (player) =>
              isEligibleForSlot(player, grant) &&
              (!selected.has(player.id) || currentId === player.id),
          );

          return (
            <label className="field slot" key={`${grant.position}-${index}`}>
              <span className="slot-grant">
                {grant.division} Division
                <small>
                  {conferenceName(grant.conference)} Conference -{" "}
                  {POSITION_NAMES[grant.position]}
                </small>
              </span>
              <select
                value={currentId}
                onChange={(event) => onPick(index, event.target.value)}
              >
                <option value="">Select {POSITION_NAMES[grant.position]}</option>
                {options.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({player.position}, {player.team})
                    {player.priorSeason ? " *" : ""}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      <button className="secondary-button" type="button" onClick={onAutoDraft}>
        Auto-fill from draft board
      </button>
    </section>
  );
}
