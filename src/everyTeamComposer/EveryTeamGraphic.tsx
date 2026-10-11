import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  BANNER_SHAPE,
  BANNER_VIEW,
  brandEmTop,
} from "../standingsComposer/bannerLayout";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { PlayerHeadshot } from "../tierListComposer/PlayerHeadshot";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  ET_CELL_GAP,
  ET_LOGO_FIT,
  everyTeamGrid,
} from "./everyTeamLayout";
import {
  EVERY_TEAM_ORDER,
  splitEveryTeamTitle,
  type EveryTeamSlots,
} from "./everyTeamState";

interface EveryTeamGraphicProps {
  brand: string;
  title: string;
  slots: EveryTeamSlots;
  activeIndex: number | null;
  exporting?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onSelectSlot: (index: number) => void;
  onClearSlot: (index: number) => void;
}

const bannerRectPath = () => {
  const right = BANNER_VIEW.width - BANNER_SHAPE.insetX;
  return [
    `M ${BANNER_SHAPE.insetX} ${BANNER_SHAPE.top}`,
    `H ${right}`,
    `V ${BANNER_SHAPE.bottom}`,
    `H ${BANNER_SHAPE.insetX}`,
    "Z",
  ].join(" ");
};

const bannerRectPathBbox = () => {
  const X = (value: number) => (value / BANNER_VIEW.width).toFixed(4);
  const Y = (value: number) => (value / BANNER_VIEW.height).toFixed(4);
  const right = BANNER_VIEW.width - BANNER_SHAPE.insetX;
  return [
    `M ${X(BANNER_SHAPE.insetX)} ${Y(BANNER_SHAPE.top)}`,
    `H ${X(right)}`,
    `V ${Y(BANNER_SHAPE.bottom)}`,
    `H ${X(BANNER_SHAPE.insetX)}`,
    "Z",
  ].join(" ");
};

export const EveryTeamGraphic = forwardRef<HTMLElement, EveryTeamGraphicProps>(
  function EveryTeamGraphic(
    {
      brand,
      title,
      slots,
      activeIndex,
      exporting = false,
      onBrandChange,
      onTitleChange,
      onSelectSlot,
      onClearSlot,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const titleLines = splitEveryTeamTitle(title);
    const grid = everyTeamGrid(1);

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
        className={exporting ? "ig-board et-board is-exporting" : "ig-board et-board"}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--brand-top" as string]: `${brandEmTop(unit)}px`,
            ["--cell" as string]: `calc(${grid.cell} * var(--u))`,
            ["--gap" as string]: String(ET_CELL_GAP),
          } as React.CSSProperties
        }
        aria-label="Instagram every-team graphic"
      >
        <header className="ig-header">
          <div className="ig-brand-slot" aria-hidden="true" />
          <input
            className="ig-brand"
            value={brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand label"
            onChange={(event) => onBrandChange(event.target.value.toUpperCase())}
          />
          <div className="ig-banner et-banner">
            <div
              className="ig-banner__fill"
              style={{ clipPath: "url(#et-banner-clip)" }}
              aria-hidden="true"
            />
            <svg
              className="ig-banner__svg"
              viewBox={`0 0 ${BANNER_VIEW.width} ${BANNER_VIEW.height}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <clipPath id="et-banner-clip" clipPathUnits="objectBoundingBox">
                  <path d={bannerRectPathBbox()} />
                </clipPath>
              </defs>
              <path
                d={bannerRectPath()}
                fill="none"
                stroke="#fff"
                strokeWidth="7"
                strokeLinejoin="miter"
              />
            </svg>
            <div className="et-title-block">
              {titleLines.map((line, index) => (
                <span key={`${index}-${line}`} className="et-title-line">
                  {line}
                </span>
              ))}
              <textarea
                className="et-title-input"
                value={title}
                maxLength={72}
                rows={2}
                spellCheck={false}
                aria-label="Every-team title"
                onChange={(event) =>
                  onTitleChange(event.target.value.toUpperCase())
                }
              />
            </div>
          </div>
        </header>
        <div className="et-grid">
          {EVERY_TEAM_ORDER.map((team, index) => {
            const stored = slots[index] ?? null;
            const player = getPlayer(stored);
            const shown =
              player && player.team === team.id ? player : null;
            return (
              <div
                key={team.id}
                className={[
                  "et-cell",
                  activeIndex === index ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  {
                    ["--cell-from" as string]: team.cellFrom,
                    ["--cell-to" as string]: team.cellTo,
                    ["--border" as string]: team.cellFrom,
                  } as React.CSSProperties
                }
              >
                <button
                  type="button"
                  className="et-cell__hit"
                  onClick={() => onSelectSlot(index)}
                  aria-label={
                    shown
                      ? `${team.name}, ${shown.name}. Change player`
                      : `${team.name}, empty. Pick a player`
                  }
                />
                <TeamLogo
                  src={team.logoSrc}
                  label={team.id}
                  shadow={0}
                  fitX={ET_LOGO_FIT}
                  fitY={ET_LOGO_FIT}
                />
                {shown ? (
                  <PlayerHeadshot
                    className="et-headshot"
                    src={shown.headshotUrl}
                    label={shown.id}
                  />
                ) : null}
                {exporting || !shown ? null : (
                  <button
                    type="button"
                    className="et-cell__clear"
                    aria-label={`Remove ${shown.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onClearSlot(index);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </article>
    );
  },
);
