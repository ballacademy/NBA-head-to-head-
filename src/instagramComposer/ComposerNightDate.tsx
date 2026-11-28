import { useComposerHudMode } from "./composerHudMode";

interface ComposerNightDateProps {
  date: string;
  todayIso: string;
  yesterdayIso: string;
  onChange: (iso: string) => void;
  onFill?: () => void;
  fillLabel?: string;
  filling?: boolean;
}

export function ComposerNightDate({
  date,
  todayIso,
  yesterdayIso,
  onChange,
  onFill,
  fillLabel = "Fill last night",
  filling = false,
}: ComposerNightDateProps) {
  const [hudMode] = useComposerHudMode();
  return (
    <div className="sc-look sc-hud-fill" role="group" aria-label="Game night">
      <span className="sc-look__label">Game</span>
      <button
        type="button"
        className={date === todayIso ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={date === todayIso}
        aria-label="Tonight"
        onClick={() => onChange(todayIso)}
      >
        Tonight
      </button>
      <button
        type="button"
        className={date === yesterdayIso ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={date === yesterdayIso}
        aria-label="Last night"
        onClick={() => onChange(yesterdayIso)}
      >
        Last night
      </button>
      {hudMode === "simple" ? null : (
        <label className="sc-field">
          Date
          <input
            type="date"
            value={date}
            aria-label="Specific game date"
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      )}
      {onFill ? (
        <button
          type="button"
          className="sc-chip"
          onClick={onFill}
          disabled={filling}
        >
          {filling ? "Loading…" : fillLabel}
        </button>
      ) : null}
    </div>
  );
}
