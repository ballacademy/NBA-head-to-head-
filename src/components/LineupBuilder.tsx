import type { Drafter, Player } from "../lib/types";

interface LineupBuilderProps {
  drafters: Drafter[];
  players: Player[];
  activeDrafterId: string;
  onActiveDrafterChange: (drafterId: string) => void;
  onPick: (slot: number, playerId: string) => void;
  onAutoDraft: () => void;
}

const slotLabels = ["Lead guard", "Second guard", "Wing", "Forward", "Big"];

export function LineupBuilder({
  drafters,
  players,
  activeDrafterId,
  onActiveDrafterChange,
  onPick,
  onAutoDraft,
}: LineupBuilderProps) {
  const activeDrafter = drafters.find(
    (drafter) => drafter.id === activeDrafterId,
  );

  if (!activeDrafter) {
    return null;
  }

  const selected = new Set(activeDrafter.lineup);

  return (
    <section className="panel lineup-builder" aria-labelledby="draft-heading">
      <div className="section-heading">
        <p className="eyebrow">Create a lineup</p>
        <h2 id="draft-heading">Draft five players</h2>
        <p>
          Switch between global challengers, adjust their five picks, and the
          bracket recalculates instantly.
        </p>
      </div>

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

      <div className="slots">
        {slotLabels.map((label, index) => (
          <label className="field slot" key={label}>
            <span>{label}</span>
            <select
              value={activeDrafter.lineup[index] ?? ""}
              onChange={(event) => onPick(index, event.target.value)}
            >
              <option value="">Select player</option>
              {players.map((player) => (
                <option
                  disabled={
                    selected.has(player.id) &&
                    activeDrafter.lineup[index] !== player.id
                  }
                  key={player.id}
                  value={player.id}
                >
                  {player.name} ({player.team}, {player.position})
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <button className="secondary-button" type="button" onClick={onAutoDraft}>
        Auto-fill balanced lineup
      </button>
    </section>
  );
}
