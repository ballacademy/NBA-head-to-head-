import { useEffect, useMemo, useState } from "react";
import type { ComposerMode } from "./composerMode";
import { composerHref } from "./composerMode";
import { ComposerNameStyleToggle } from "./ComposerNameStyleToggle";
import { ComposerStampToggle } from "./ComposerStampToggle";
import {
  downloadExportHistoryItem,
  useComposerExportHistory,
} from "./composerExportHistory";
import { useComposerHudMode } from "./composerHudMode";
import { readComposerRecents } from "./composerRecents";
import { jumpComposerMode, matchingComposerTabs } from "./composerJump";
import { useComposerPreviewZoom } from "./composerPreviewZoom";
import { useComposerFocusMode } from "./composerFocusMode";
import {
  COMPOSER_UNSAVED_EVENT,
  composerModeUnsaved,
  readComposerUnsaved,
} from "./composerUnsaved";

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
      { mode: "leader-bars", label: "Leader bars" },
      { mode: "leader-split", label: "Leader split" },
      { mode: "dual-ranks", label: "Dual ranks" },
    ],
  },
  {
    label: "Night / week / stats",
    tabs: [
      { mode: "stat-card", label: "Stat card" },
      { mode: "stat-card-cover", label: "Cover" },
      { mode: "takeaways-cover", label: "Takeaways" },
      { mode: "takeaways-card", label: "Takeaway cards" },
      { mode: "compare", label: "Compare" },
      { mode: "player-of-the-day", label: "POTD" },
      { mode: "potd-leaderboard", label: "Leaderboard" },
      { mode: "team-of-the-week", label: "TOTW" },
      { mode: "team-of-the-week-plus", label: "TOTW Plus" },
      { mode: "shot-chart", label: "Shot chart" },
      { mode: "picks", label: "Picks" },
    ],
  },
  {
    label: "News",
    tabs: [
      { mode: "headline", label: "Headline" },
      { mode: "poster-news", label: "Poster news" },
      { mode: "quote", label: "Quote" },
      { mode: "mock-trade", label: "Mock trade" },
      { mode: "play-in", label: "Play-in" },
      { mode: "injury", label: "Injury" },
      { mode: "schedule", label: "Schedule" },
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
  "takeaways-cover": "Takeaways",
  "takeaways-card": "Takeaway cards",
  "leader-bars": "Leader bars",
  "leader-split": "Leader split",
  "poster-news": "Poster news",
  "dual-ranks": "Dual ranks",
  compare: "Compare",
  "player-of-the-day": "POTD",
  "potd-leaderboard": "Leaderboard",
  "team-of-the-week": "TOTW",
  "team-of-the-week-plus": "TOTW Plus",
  headline: "Headline",
  quote: "Quote",
  "mock-trade": "Mock trade",
  "play-in": "Play-in",
  injury: "Injury",
  schedule: "Schedule",
  "shot-chart": "Shot chart",
  picks: "Picks",
};

export function ComposerTabs({
  mode,
  photoEdit,
  onSelect,
  onPhotoEditChange,
}: ComposerTabsProps) {
  const [query, setQuery] = useState("");
  const [hudMode, setHudMode] = useComposerHudMode();
  const [previewZoom, setPreviewZoom] = useComposerPreviewZoom();
  const [focusMode, setFocusMode] = useComposerFocusMode();
  const [unsaved, setUnsaved] = useState(readComposerUnsaved);
  const exports = useComposerExportHistory();
  const recents = useMemo(() => readComposerRecents(), [mode]);
  const allTabs = COMPOSER_TAB_GROUPS.flatMap((group) => group.tabs);
  const hits = matchingComposerTabs(query, allTabs);
  const hitModes = new Set(hits.map((tab) => tab.mode));

  useEffect(() => {
    const jumped = jumpComposerMode(query, allTabs);
    if (jumped && jumped !== mode) {
      onSelect(jumped);
    }
  }, [query]);

  useEffect(() => {
    const sync = () => setUnsaved(readComposerUnsaved());
    window.addEventListener(COMPOSER_UNSAVED_EVENT, sync);
    return () => window.removeEventListener(COMPOSER_UNSAVED_EVENT, sync);
  }, []);

  return (
    <nav className="sc-tabs" aria-label="Composer type">
      <div className="sc-tabs__bar">
        <label className="sc-tabs__search">
          <span className="sc-tabs__label">Search</span>
          <input
            type="search"
            value={query}
            placeholder="Find a graphic (head → Headline)"
            aria-label="Search composers"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }
              const jumped = jumpComposerMode(query, allTabs) ?? hits[0]?.mode;
              if (jumped) {
                event.preventDefault();
                onSelect(jumped);
              }
            }}
          />
        </label>
        {exports.length ? (
          <div
            className="sc-tabs__group sc-tabs__group--recents"
            role="group"
            aria-label="Recents"
          >
            <span className="sc-tabs__label">Recents</span>
            <div className="sc-tabs__pills">
              {exports.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.mode === mode ? "is-on" : ""}
                  title={`Download ${item.filename}`}
                  aria-label={`Re-download ${item.filename}`}
                  onClick={() => {
                    downloadExportHistoryItem(item);
                    if (item.mode) {
                      onSelect(item.mode);
                    }
                  }}
                >
                  {item.filename.replace(/\.png$/i, "").slice(0, 28)}
                </button>
              ))}
            </div>
          </div>
        ) : recents.length ? (
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
          <div className="sc-tabs__pills">
            <button
              type="button"
              className={photoEdit ? "is-on" : ""}
              aria-pressed={photoEdit}
              aria-label="Show upload, change player, and zoom controls"
              onClick={() => onPhotoEditChange(!photoEdit)}
            >
              Edit
            </button>
            <button
              type="button"
              className={hudMode === "simple" ? "is-on" : ""}
              aria-pressed={hudMode === "simple"}
              aria-label="Simple HUD"
              onClick={() => setHudMode("simple")}
            >
              Simple
            </button>
            <button
              type="button"
              className={hudMode === "full" ? "is-on" : ""}
              aria-pressed={hudMode === "full"}
              aria-label="Full HUD"
              onClick={() => setHudMode("full")}
            >
              Full
            </button>
            <button
              type="button"
              className={focusMode ? "is-on" : ""}
              aria-pressed={focusMode}
              aria-label="Focus mode"
              onClick={() => setFocusMode(!focusMode)}
            >
              Focus
            </button>
          </div>
          <div className="sc-tabs__pills" role="group" aria-label="Preview zoom">
            {(["fit", "75", "100"] as const).map((zoom) => (
              <button
                key={zoom}
                type="button"
                className={previewZoom === zoom ? "is-on" : ""}
                aria-pressed={previewZoom === zoom}
                onClick={() => setPreviewZoom(zoom)}
              >
                {zoom === "fit" ? "Fit" : `${zoom}%`}
              </button>
            ))}
          </div>
          <ComposerNameStyleToggle />
          <ComposerStampToggle />
          {exports.length ? (
            <label className="sc-field">
              Exports
              <select
                aria-label="Re-download last exports"
                defaultValue=""
                onChange={(event) => {
                  const item = exports.find((row) => row.id === event.target.value);
                  event.target.value = "";
                  if (item) {
                    downloadExportHistoryItem(item);
                  }
                }}
              >
                <option value="">Last {exports.length} PNGs</option>
                {exports.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.filename}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>
      {COMPOSER_TAB_GROUPS.map((group) => {
        const tabs = group.tabs.filter((tab) => hitModes.has(tab.mode));
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
                  {composerModeUnsaved(tab.mode) || unsaved[tab.mode] ? (
                    <span className="sc-unsaved" title="Unsaved draft" />
                  ) : null}
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
