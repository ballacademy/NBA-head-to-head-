import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  formatWinsLabel,
  parseWinsInput,
  rankLeaderboard,
  type LeaderboardEntry,
} from "./potdLeaderboardState";

interface PotdLeaderboardGraphicProps {
  title: string;
  entries: LeaderboardEntry[];
  look?: ComposerLook;
  showBa?: boolean;
  exporting?: boolean;
  onTitleChange: (value: string) => void;
  onNameChange: (id: string, name: string) => void;
  onWinsChange: (id: string, wins: number) => void;
  onRemove: (id: string) => void;
}

export const PotdLeaderboardGraphic = forwardRef<
  HTMLElement,
  PotdLeaderboardGraphicProps
>(function PotdLeaderboardGraphic(
  {
    title,
    entries,
    look = "white",
    showBa = false,
    exporting = false,
    onTitleChange,
    onNameChange,
    onWinsChange,
    onRemove,
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const [editingId, setEditingId] = useState<string | null>(null);
  const ranked = rankLeaderboard(entries);

  const setRefs = (node: HTMLElement | null) => {
    localRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  useLayoutEffect(() => {
    const node = localRef.current;
    if (!node) {
      return;
    }
    const sync = () => {
      const width = node.getBoundingClientRect().width;
      if (width > 0) {
        setUnit(width / GRAPHIC_WIDTH);
      }
    };
    sync();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <article
      ref={setRefs}
      className={["plb-board", exporting ? "is-exporting" : "", composerLookClass(look)]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--u" as string]: `${unit}px` } as React.CSSProperties}
      aria-label="Instagram POTD leaderboard graphic"
    >
      {showBa ? (
        <img
          className="composer-ba"
          src="/ba-logo-circled.png"
          alt=""
          aria-hidden="true"
        />
      ) : null}
      <header className="plb-title-plate">
        <div className="plb-title-block">
          <ComposerTitleField
            value={title}
            lines={[title.replace(/\s+/g, " ").trim().toUpperCase() || "POTD LEADERBOARD"]}
            ariaLabel="Leaderboard title"
            inputClassName="plb-title-input"
            lineClassName="plb-title-line"
            onChange={onTitleChange}
          />
        </div>
      </header>
      <div
        className={["plb-list", ranked.length === 0 ? "plb-list--empty" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {ranked.length === 0 ? (
          <p className="plb-empty">Add players</p>
        ) : (
          ranked.map((entry) => (
            <div key={entry.id} className="plb-row">
              <span className="plb-rank">{entry.rankLabel}</span>
              <input
                className="plb-name"
                value={
                  editingId === entry.id
                    ? entry.name
                    : entry.displayName || entry.name
                }
                maxLength={40}
                spellCheck={false}
                aria-label="Player name"
                onFocus={() => setEditingId(entry.id)}
                onBlur={() => setEditingId(null)}
                onChange={(event) => onNameChange(entry.id, event.target.value)}
              />
              <input
                className="plb-wins"
                value={formatWinsLabel(entry.wins)}
                maxLength={6}
                inputMode="numeric"
                aria-label={`${entry.name || "Player"} win total`}
                onChange={(event) =>
                  onWinsChange(entry.id, parseWinsInput(event.target.value))
                }
              />
              {exporting ? null : (
                <button
                  type="button"
                  className="plb-remove"
                  aria-label={`Remove ${entry.name || "player"}`}
                  onClick={() => onRemove(entry.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </article>
  );
});
