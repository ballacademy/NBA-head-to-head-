import {
  useComposerNameStyle,
  type ComposerNameStyle,
} from "./composerNameStyle";

const OPTIONS: Array<{ value: ComposerNameStyle; label: string }> = [
  { value: "last", label: "Last" },
  { value: "full", label: "First+last" },
  { value: "initial", label: "F. Last" },
];

export function ComposerNameStyleToggle() {
  const [style, setStyle] = useComposerNameStyle();
  return (
    <div className="sc-look" role="group" aria-label="Name style">
      <span className="sc-look__label">Names</span>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={style === option.value ? "sc-chip is-on" : "sc-chip"}
          aria-pressed={style === option.value}
          onClick={() => setStyle(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
