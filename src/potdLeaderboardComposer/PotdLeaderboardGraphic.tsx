import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  formatComposerPersonName,
  useComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import { getTeam } from "../standingsComposer/teams";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { PlayerHeadshot } from "../tierListComposer/PlayerHeadshot";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  leaderboardBlankCount,
  leaderboardListInnerH,
  leaderboardRowH,
  PLB_ROW_H,
} from "./potdLeaderboardLayout";
import {
  formatWinsLabel,
  isPotdPairName,
  medalForRank,
  packLeaderboardPages,
  parseWinsInput,
  rankLeaderboard,
  type LeaderboardEntry,
  type RankedLeaderboardEntry,
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
  pageIndex?: number;
  onTitleChange: (value: string) => void;
  onNameChange: (id: string, name: string) => void;
  onWinsChange: (id: string, wins: number) => void;
  onRemove: (id: string) => void;
  onNextPage?: () => void;
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
    pageIndex = 0,
    onTitleChange,
    onNameChange,
    onWinsChange,
    onRemove,
    onNextPage,
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const [nameStyle] = useComposerNameStyle();
  const [nameFocus, setNameFocus] = useState<string | null>(null);
  const ranked = rankLeaderboard(entries);
  const pages = packLeaderboardPages(entries);
  const pageCount = Math.max(1, pages.length);
  const safePage = Math.min(pageIndex, pageCount - 1);
  const namedOnPage = pages[safePage] ?? [];
  const unnamed = ranked.filter((row) => !row.name.trim());
  const isLastPage = safePage === pageCount - 1;
  const leftoverUnnamed: RankedLeaderboardEntry[] = [];
  if (isLastPage && unnamed.length) {
    let used = namedOnPage.reduce(
      (sum, row) => sum + leaderboardRowH(row.displayLines.length > 1),
      0,
    );
    const inner = leaderboardListInnerH();
    for (const row of unnamed) {
      if (used + PLB_ROW_H > inner) {
        break;
      }
      leftoverUnnamed.push(row);
      used += PLB_ROW_H;
    }
  }
  const pageRows = [...namedOnPage, ...leftoverUnnamed];
  const showSwipe = pageCount > 1 && safePage < pageCount - 1;

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
        {pageRows.map((entry, index) => {
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
                <span
                  className={["plb-rank", medal ? `is-${medal}` : ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {entry.rankLabel}
                </span>
                <div className="plb-name-cell">
                  <textarea
                    className="plb-name"
                    rows={wrap ? 2 : 1}
                    value={
                      nameFocus === entry.id
                        ? entry.name
                        : formatComposerPersonName(entry.name, nameStyle) ||
                          entry.name
                    }
                    maxLength={40}
                    spellCheck={false}
                    aria-label="Player name"
                    style={{
                      fontSize: `calc(${42 * entry.nameScale} * var(--u))`,
                    }}
                    onFocus={() => setNameFocus(entry.id)}
                    onBlur={() => setNameFocus(null)}
                    onChange={(event) =>
                      onNameChange(
                        entry.id,
                        event.target.value.replace(/[\r\n]+/g, " "),
                      )
                    }
                  />
                </div>
                <span
                  className={[
                    "plb-head",
                    highlighted && entry.headshotUrl ? "is-potd" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                >
                  {entry.headshotUrl ? (
                    <PlayerHeadshot
                      className="plb-head__img"
                      src={entry.headshotUrl}
                      label={entry.name}
                    />
                  ) : null}
                </span>
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
          { length: leaderboardBlankCount(pageRows) },
          (_, index) => (
            <div
              key={`plb-blank-${index}`}
              className={[
                "plb-row",
                "is-blank",
                (pageRows.length + index) % 2 === 1 ? "is-alt" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            />
          ),
        )}
      </div>
      {showSwipe ? (
        exporting ? (
          <div className="plb-swipe" aria-hidden="true">
            <span className="plb-swipe__label">Swipe</span>
            <span className="plb-swipe__chev" />
          </div>
        ) : (
          <button
            type="button"
            className="plb-swipe"
            aria-label="Next leaderboard page"
            onClick={onNextPage}
          >
            <span className="plb-swipe__label">Swipe</span>
            <span className="plb-swipe__chev" />
          </button>
        )
      ) : null}
    </article>
  );
});
