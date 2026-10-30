import {
  EVERY_TEAM_STAT_METRICS,
  parseEveryTeamStatMetric,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";

interface StripStatHudProps {
  on: boolean;
  metric: EveryTeamStatMetric;
  onToggle: (on: boolean) => void;
  onMetric: (metric: EveryTeamStatMetric) => void;
}

export function StripStatHud({
  on,
  metric,
  onToggle,
  onMetric,
}: StripStatHudProps) {
  return (
    <label className="sc-field">
      <span className="sc-toolbar__eyebrow">Stat under name</span>
      <button
        type="button"
        className={on ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={on}
        aria-label="Stat under name"
        onClick={() => onToggle(!on)}
      >
        {on ? "On" : "Off"}
      </button>
      {on ? (
        <select
          value={metric}
          aria-label="Stat under name metric"
          onChange={(event) =>
            onMetric(parseEveryTeamStatMetric(event.target.value))
          }
        >
          {EVERY_TEAM_STAT_METRICS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      ) : null}
    </label>
  );
}
