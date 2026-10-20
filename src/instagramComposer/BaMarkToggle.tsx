import { writeLastShowBa } from "./composerBoardDefaults";
import {
  useComposerBaCorner,
  type ComposerBaCorner,
} from "./composerBaCorner";

interface BaMarkToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

const CORNERS: Array<{ id: ComposerBaCorner; label: string }> = [
  { id: "top-left", label: "Top left" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-right", label: "Bottom right" },
];

export function BaMarkToggle({ on, onChange }: BaMarkToggleProps) {
  const [corner, setCorner] = useComposerBaCorner();
  return (
    <div className="sc-look" role="group" aria-label="BA mark">
      <span className="sc-look__label">BA mark</span>
      <button
        type="button"
        className={on ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={on}
        aria-label="BA mark"
        onClick={() => {
          const next = !on;
          writeLastShowBa(next);
          onChange(next);
        }}
      >
        {on ? "On" : "Off"}
      </button>
      {on
        ? CORNERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={corner === item.id ? "sc-chip is-on" : "sc-chip"}
              aria-pressed={corner === item.id}
              aria-label={`BA ${item.label}`}
              onClick={() => setCorner(item.id)}
            >
              {item.label}
            </button>
          ))
        : null}
    </div>
  );
}
