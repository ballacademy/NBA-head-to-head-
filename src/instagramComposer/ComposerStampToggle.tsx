import { useComposerStamp } from "./composerStamp";

export function ComposerStampToggle() {
  const [stamp, setStamp] = useComposerStamp();
  return (
    <label className="sc-field sc-field--wide">
      <span className="sc-toolbar__eyebrow">Date stamp</span>
      <button
        type="button"
        className={stamp.on ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={stamp.on}
        aria-label="Date stamp"
        onClick={() => setStamp((current) => ({ ...current, on: !current.on }))}
      >
        {stamp.on ? "On" : "Off"}
      </button>
      <input
        value={stamp.text}
        maxLength={28}
        aria-label="Stamp text"
        placeholder="OCT 16, 2026"
        onChange={(event) =>
          setStamp((current) => ({
            ...current,
            text: event.target.value.slice(0, 28).toUpperCase(),
          }))
        }
      />
    </label>
  );
}

export function ComposerStampMark({ modeOn }: { modeOn: boolean }) {
  const [stamp] = useComposerStamp();
  if (!modeOn || !stamp.on || !stamp.text.trim()) {
    return null;
  }
  return (
    <p className="composer-stamp" aria-hidden="true">
      {stamp.text}
    </p>
  );
}
