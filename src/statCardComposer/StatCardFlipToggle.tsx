interface StatCardFlipToggleProps {
  statsLeft: boolean;
  onChange: (statsLeft: boolean) => void;
}

export function StatCardFlipToggle({
  statsLeft,
  onChange,
}: StatCardFlipToggleProps) {
  return (
    <label className="sc-field">
      <span className="sc-toolbar__eyebrow">Flip</span>
      <button
        type="button"
        className={statsLeft ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={statsLeft}
        aria-label="Stats on the left"
        onClick={() => onChange(!statsLeft)}
      >
        {statsLeft ? "Stats left" : "Stats right"}
      </button>
    </label>
  );
}
