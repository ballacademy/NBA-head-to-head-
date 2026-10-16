import { useMemo, useState } from "react";
import type { ComposerMode } from "./composerMode";
import { composerHref } from "./composerMode";
import { ComposerNameStyleToggle } from "./ComposerNameStyleToggle";
import { ComposerStampToggle } from "./ComposerStampToggle";
import { readComposerRecents } from "./composerRecents";

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
      { mode: "plot", label: "Plot" },
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

export const COMPOSER_MODE_LABEL: Record<ComposerMode, string> = {
  standings: "Standings",
  tier: "Tier list",
  "every-team": "Every team",
  pyramid: "Pyramid",
  plot: "Plot",
  "ranked-lineups": "Ranked lineups",
  lineup: "Lineup",
  "stat-card": "Stat card",
  "stat-card-cover": "Cover",
  compare: "Compare",
  "player-of-the-day": "POTD",
  "potd-leaderboard": "Leaderboard",
  "team-of-the-week": "TOTW",
  "team-of-the-week-plus": "TOTW Plus",
  headline: "Headline",
  quote: "Quote",
  "mock-trade": "Mock trade",
  "play-in": "Play-in",
};

export function ComposerTabs({
  mode,
  photoEdit,
  onSelect,
  onPhotoEditChange,
}: ComposerTabsProps) {
  const [query, setQuery] = useState("");
  const recents = useMemo(() => readComposerRecents(), [mode]);
  const needle = query.trim().toLowerCase();
  const match = (label: string) =>
    !needle || label.toLowerCase().includes(needle);

  return (
    <nav className="sc-tabs" aria-label="Composer type">
      <div className="sc-tabs__bar">
        <label className="sc-tabs__search">
          <span className="sc-tabs__label">Search</span>
          <input
            type="search"
            value={query}
            placeholder="Find a graphic"
            aria-label="Search composers"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {recents.length ? (
          <div
            className="sc-tabs__group sc-tabs__group--recents"
            role="group"
            aria-label="Recents"
          >
            <span className="sc-tabs__label">Recents</span>
            <div className="sc-tabs__pills">
              {recents.map((recent) => (
                <button
                  key={`${recent.mode}-${recent.at}`}
                  type="button"
                  className={mode === recent.mode ? "is-on" : ""}
                  aria-current={mode === recent.mode ? "page" : undefined}
                  title={recent.title}
                  onClick={() => onSelect(recent.mode)}
                >
                  {COMPOSER_MODE_LABEL[recent.mode] ?? recent.mode}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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
          <ComposerNameStyleToggle />
          <ComposerStampToggle />
        </div>
      </div>
      {COMPOSER_TAB_GROUPS.map((group) => {
        const tabs = group.tabs.filter((tab) => match(tab.label));
        if (!tabs.length) {
          return null;
        }
        return (
          <div
            key={group.label}
            className="sc-tabs__group"
            role="group"
            aria-label={group.label}
          >
            <span className="sc-tabs__label">{group.label}</span>
            <div className="sc-tabs__pills">
              {tabs.map((tab) => (
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
        );
      })}
      <span className="sc-tabs__href" hidden>
        {composerHref(mode)}
      </span>
    </nav>
  );
}
