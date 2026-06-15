import type { Drafter } from "../lib/types";

interface WaitingRoomProps {
  opponent: Drafter;
  opponentPickCount: number;
}

export function WaitingRoom({ opponent, opponentPickCount }: WaitingRoomProps) {
  return (
    <section className="panel waiting-room" aria-live="polite">
      <p className="eyebrow">Draft complete</p>
      <h2>Waiting for opponent&apos;s selection</h2>
      <p>
        Your lineup is locked in. {opponent.name} from {opponent.city} is still
        drafting.
      </p>

      <div className="waiting-indicator">
        <span className="waiting-spinner" aria-hidden="true" />
        <strong>
          Opponent picks: {opponentPickCount} / {opponent.draftSlots.length}
        </strong>
      </div>
    </section>
  );
}
