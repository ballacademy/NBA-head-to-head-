import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeam } from "../standingsComposer/teams";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { PlayerHeadshot } from "../tierListComposer/PlayerHeadshot";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { leaderboardBlankCount } from "./potdLeaderboardLayout";
import {
  formatWinsLabel,
  isPotdPairName,
  medalForRank,
  parseWinsInput,
  rankLeaderboard,
  type LeaderboardEntry,
} from "./potdLeaderboardState";

interface PotdLeaderboardGraphicProps {
  title: string;
  entries: LeaderboardEntry[];
  look?: ComposerLook;
  purpleFlair?: boolean;
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
    purpleFlair = false,
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
      const width = node.offsetWidth;
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
        composerFlairClass(purpleFlair),
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
      <div className="plb-list">
        {ranked.map((entry, index) => {
            const team = showPips ? getTeam(entry.teamId) : null;
            const highlighted = isPotdPairName(entry.name, potdKeys);
            const wrap = entry.displayLines.length > 1;
            const medal = medalForRank(entry.rank);
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
                <span className="plb-head" aria-hidden="true">
                  {entry.headshotUrl ? (
                    <PlayerHeadshot
                      className="plb-head__img"
                      src={entry.headshotUrl}
                      label={entry.name}
                    />
                  ) : null}
                </span>
                <span
                  className={["plb-rank", medal ? `is-${medal}` : ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {entry.rankLabel}
                </span>
                <textarea
                  className="plb-name"
                  rows={wrap ? 2 : 1}
                  value={entry.name}
                  maxLength={40}
                  spellCheck={false}
                  aria-label="Player name"
                  style={{
                    fontSize: `calc(${42 * entry.nameScale} * var(--u))`,
                  }}
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
          })}
        {Array.from(
          { length: leaderboardBlankCount(ranked) },
          (_, index) => (
            <div
              key={`plb-blank-${index}`}
              className={[
                "plb-row",
                "is-blank",
                (ranked.length + index) % 2 === 1 ? "is-alt" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            />
          ),
        )}
      </div>
    </article>
  );
});
