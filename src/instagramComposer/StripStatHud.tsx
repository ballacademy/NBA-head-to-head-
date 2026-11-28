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
  label?: string;
  className?: string;
  /** Keep the metric select visible so Fill / Sort can use it while the print is off. */
  alwaysShowMetric?: boolean;
}

export function StripStatHud({
  on,
  metric,
  onToggle,
  onMetric,
  label = "Stat under name",
  className,
  alwaysShowMetric = false,
}: StripStatHudProps) {
  return (
    <label className={["sc-field", className].filter(Boolean).join(" ")}>
      <span className="sc-toolbar__eyebrow">{label}</span>
      <button
        type="button"
        className={on ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={on}
        aria-label={label}
        onClick={() => onToggle(!on)}
      >
        {on ? "On" : "Off"}
      </button>
      {on || alwaysShowMetric ? (
        <select
          value={metric}
          aria-label={`${label} metric`}
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
