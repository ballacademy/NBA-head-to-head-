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
      { mode: "every-team", label: "Every team" },
      { mode: "tier", label: "Tier list" },
      { mode: "ranked-lineups", label: "Ranked lineups" },
      { mode: "lineup", label: "Lineup" },
    ],
  },
  {
    label: "Week",
    tabs: [
      { mode: "team-of-the-week", label: "Team of the Week" },
      { mode: "team-of-the-week-plus", label: "TOTW Plus" },
    ],
  },
  {
    label: "POTD",
    tabs: [
      { mode: "player-of-the-day", label: "Matchup" },
      { mode: "potd-leaderboard", label: "Leaderboard" },
    ],
  },
  {
    label: "Posts",
    tabs: [
      { mode: "pyramid", label: "Pyramid" },
      { mode: "headline", label: "Headline" },
      { mode: "compare", label: "Compare" },
      { mode: "quote", label: "Quote" },
      { mode: "play-in", label: "Play-in" },
      { mode: "stat-card", label: "Stat card" },
      { mode: "stat-card-cover", label: "Cover" },
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
