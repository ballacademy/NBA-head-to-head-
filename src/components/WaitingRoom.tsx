interface WaitingRoomProps {
  opponentPickCount: number;
  totalPicks: number;
}

export function WaitingRoom({
  opponentPickCount,
  totalPicks,
}: WaitingRoomProps) {
  return (
    <section className="panel waiting-room" aria-live="polite">
      <p className="eyebrow">Draft complete</p>
      <h2>Waiting for your opponent</h2>
      <p>
        Your lineup is locked in. Your opponent is still drafting in the
        background and will be revealed once both teams are ready.
      </p>

      <div className="waiting-indicator">
        <span className="waiting-spinner" aria-hidden="true" />
        <strong>
          Opponent progress: {opponentPickCount} / {totalPicks}
        </strong>
      </div>
    </section>
  );
}
