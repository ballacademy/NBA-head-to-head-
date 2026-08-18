import type { PlayHubChip } from "../lib/playHubRetention";

interface PlayHubStripProps {
  chips: PlayHubChip[];
  onChip: (chip: PlayHubChip) => void;
}

export function PlayHubStrip({ chips, onChip }: PlayHubStripProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="play-hub-strip" role="list" aria-label="Play updates">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className={`play-hub-strip__chip play-hub-strip__chip--${chip.id}`}
          role="listitem"
          onClick={() => onChip(chip)}
        >
          <span className="play-hub-strip__copy">
            {chip.detail ? (
              <span className="play-hub-strip__detail">{chip.detail}</span>
            ) : null}
            <strong>{chip.label}</strong>
          </span>
          <span className="play-hub-strip__cta">{chip.ctaLabel}</span>
        </button>
      ))}
    </div>
  );
}
