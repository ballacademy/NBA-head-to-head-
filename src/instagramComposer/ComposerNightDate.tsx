interface ComposerNightDateProps {
  date: string;
  todayIso: string;
  yesterdayIso: string;
  onChange: (iso: string) => void;
}

export function ComposerNightDate({
  date,
  todayIso,
  yesterdayIso,
  onChange,
}: ComposerNightDateProps) {
  return (
    <div className="sc-look" role="group" aria-label="Game date">
      <span className="sc-look__label">Game</span>
      <button
        type="button"
        className={date === todayIso ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={date === todayIso}
        onClick={() => onChange(todayIso)}
      >
        Today
      </button>
      <button
        type="button"
        className={date === yesterdayIso ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={date === yesterdayIso}
        onClick={() => onChange(yesterdayIso)}
      >
        Yesterday
      </button>
      <label className="sc-field">
        Date
        <input
          type="date"
          value={date}
          aria-label="Specific game date"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}
