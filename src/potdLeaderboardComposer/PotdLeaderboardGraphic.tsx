import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeam } from "../standingsComposer/teams";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  formatWinsLabel,
  isPotdPairName,
  parseWinsInput,
  rankLeaderboard,
  type LeaderboardEntry,
} from "./potdLeaderboardState";

interface PotdLeaderboardGraphicProps {
  title: string;
  entries: LeaderboardEntry[];
  look?: ComposerLook;
  showBa?: boolean;
  showPips?: boolean;
  potdKeys?: string[];
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
    showPips = true,
    potdKeys = [],
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
      className={[
        "plb-board",
        exporting ? "is-exporting" : "",
        showPips ? "is-pips-on" : "is-pips-off",
        composerLookClass(look),
      ]
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
          ranked.map((entry, index) => {
            const team = showPips ? getTeam(entry.teamId) : null;
            const highlighted = isPotdPairName(entry.name, potdKeys);
            const wrap = entry.displayLines.length > 1;
            return (
              <div
                key={entry.id}
                className={[
                  "plb-row",
                  index % 2 === 1 ? "is-alt" : "",
                  highlighted ? "is-potd" : "",
                  wrap ? "is-wrap" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {showPips ? (
                  <span className="plb-pip" aria-hidden="true">
                    {team ? (
                      <TeamLogo
                        className="plb-pip__logo"
                        src={team.logoSrc}
                        label=""
                        fitX={0.88}
                        fitY={0.88}
                      />
                    ) : (
                      <span className="plb-pip__bar" />
                    )}
                  </span>
                ) : null}
                <span className="plb-rank">{entry.rankLabel}</span>
                <textarea
                  className="plb-name"
                  rows={wrap ? 2 : 1}
                  value={
                    editingId === entry.id
                      ? entry.name
                      : entry.displayLines.join("\n")
                  }
                  maxLength={40}
                  spellCheck={false}
                  aria-label="Player name"
                  style={{
                    fontSize: `calc(${42 * entry.nameScale} * var(--u))`,
                  }}
                  onFocus={() => setEditingId(entry.id)}
                  onBlur={() => setEditingId(null)}
                  onChange={(event) =>
                    onNameChange(
                      entry.id,
                      event.target.value.replace(/[\r\n]+/g, " "),
                    )
                  }
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
            );
          })
        )}
      </div>
    </article>
  );
});
