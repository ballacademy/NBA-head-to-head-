import type { ComposerMode } from "./composerMode";

interface ComposerTabsProps {
  mode: ComposerMode;
  onSelect: (mode: ComposerMode) => void;
}

export function ComposerTabs({ mode, onSelect }: ComposerTabsProps) {
  return (
    <nav className="sc-tabs" aria-label="Composer type">
      <button
        type="button"
        className={mode === "standings" ? "is-on" : ""}
        aria-current={mode === "standings" ? "page" : undefined}
        onClick={() => onSelect("standings")}
      >
        Standings
      </button>
      <button
        type="button"
        className={mode === "tier" ? "is-on" : ""}
        aria-current={mode === "tier" ? "page" : undefined}
        onClick={() => onSelect("tier")}
      >
        Tier list
      </button>
    </nav>
  );
}
