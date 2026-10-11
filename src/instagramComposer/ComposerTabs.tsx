import type { ComposerMode } from "./composerMode";

interface ComposerTabsProps {
  mode: ComposerMode;
  onSelect: (mode: ComposerMode) => void;
}

const TABS: { mode: ComposerMode; label: string }[] = [
  { mode: "standings", label: "Standings" },
  { mode: "tier", label: "Tier list" },
  { mode: "every-team", label: "Every team" },
];

export function ComposerTabs({ mode, onSelect }: ComposerTabsProps) {
  return (
    <nav className="sc-tabs" aria-label="Composer type">
      {TABS.map((tab) => (
        <button
          key={tab.mode}
          type="button"
          className={mode === tab.mode ? "is-on" : ""}
          aria-current={mode === tab.mode ? "page" : undefined}
          onClick={() => onSelect(tab.mode)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
