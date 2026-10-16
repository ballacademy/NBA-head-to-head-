import type { ComposerMode } from "./composerMode";

interface ComposerTabsProps {
  mode: ComposerMode;
  photoEdit: boolean;
  onSelect: (mode: ComposerMode) => void;
  onPhotoEditChange: (on: boolean) => void;
}

export const COMPOSER_TAB_GROUPS: {
  label: string;
  tabs: { mode: ComposerMode; label: string }[];
}[] = [
  {
    label: "Rankings",
    tabs: [
      { mode: "standings", label: "Standings" },
      { mode: "tier", label: "Tier list" },
      { mode: "every-team", label: "Every team" },
      { mode: "pyramid", label: "Pyramid" },
      { mode: "ranked-lineups", label: "Ranked lineups" },
      { mode: "lineup", label: "Lineup" },
    ],
  },
  {
    label: "Night / week / stats",
    tabs: [
      { mode: "stat-card", label: "Stat card" },
      { mode: "stat-card-cover", label: "Cover" },
      { mode: "compare", label: "Compare" },
      { mode: "player-of-the-day", label: "POTD" },
      { mode: "potd-leaderboard", label: "Leaderboard" },
      { mode: "team-of-the-week", label: "TOTW" },
      { mode: "team-of-the-week-plus", label: "TOTW Plus" },
    ],
  },
  {
    label: "News",
    tabs: [
      { mode: "headline", label: "Headline" },
      { mode: "quote", label: "Quote" },
      { mode: "mock-trade", label: "Mock trade" },
      { mode: "play-in", label: "Play-in" },
    ],
  },
];

export function ComposerTabs({
  mode,
  photoEdit,
  onSelect,
  onPhotoEditChange,
}: ComposerTabsProps) {
  return (
    <nav className="sc-tabs" aria-label="Composer type">
      {COMPOSER_TAB_GROUPS.map((group) => (
        <div
          key={group.label}
          className="sc-tabs__group"
          role="group"
          aria-label={group.label}
        >
          <span className="sc-tabs__label">{group.label}</span>
          <div className="sc-tabs__pills">
            {group.tabs.map((tab) => (
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
          </div>
        </div>
      ))}
      <div className="sc-tabs__edit">
        <span className="sc-tabs__label">HUD</span>
        <button
          type="button"
          className={photoEdit ? "is-on" : ""}
          aria-pressed={photoEdit}
          aria-label="Show upload, change player, and zoom controls"
          onClick={() => onPhotoEditChange(!photoEdit)}
        >
          Edit
        </button>
      </div>
    </nav>
  );
}
