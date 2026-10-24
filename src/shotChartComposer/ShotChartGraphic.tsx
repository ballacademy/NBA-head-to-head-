import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerNameLines,
  useComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import {
  halfCourtSvgPaths,
  shotChartBoardRects,
  shotToPx,
} from "./shotChartLayout";
import {
  formatZoneSplit,
  shotLine,
  shotZoneSplits,
  splitShotChartTitle,
  visibleShots,
  type ShotChartDraft,
} from "./shotChartState";

interface ShotChartGraphicProps {
  draft: ShotChartDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  exporting?: boolean;
  story?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onPick: () => void;
}

export const ShotChartGraphic = forwardRef<HTMLElement, ShotChartGraphicProps>(
  function ShotChartGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      exporting = false,
      story = false,
      onBrandChange,
      onTitleChange,
      onPick,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const [nameStyle] = useComposerNameStyle();
    const nameLines = composerNameLines(
      draft.firstName,
      draft.lastName,
      nameStyle,
    );
    const titleLines = splitShotChartTitle(draft.title);
    const boardH = story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
    const rects = useMemo(() => shotChartBoardRects(boardH), [boardH]);
    const court = rects.court;
    const paths = useMemo(
      () => halfCourtSvgPaths(court.w, court.h),
      [court.w, court.h],
    );
    const shots = visibleShots(draft.shots, draft.showMakes, draft.showMisses);
    const empty = draft.shots.length === 0;
    const zones = shotZoneSplits(shots);

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
          "shc-board",
          exporting ? "is-exporting" : "",
          story ? "is-story" : "",
          empty ? "is-empty" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          ["--u" as string]: `${unit}px`,
          height: story ? STORY_DESIGN_HEIGHT : undefined,
        }}
        aria-label="Instagram shot chart graphic"
      >
        {draft.showBa ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        {draft.showBa ? null : (
          <input
            className="shc-brand"
            value={draft.brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand label"
            onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
          />
        )}
        <div className="shc-title-block">
          <ComposerTitleField
            value={draft.title}
            lines={titleLines}
            ariaLabel="Shot chart title"
            inputClassName="shc-title-input"
            lineClassName="shc-title-line"
            onChange={onTitleChange}
          />
        </div>
        <button type="button" className="shc-player" onClick={onPick}>
          {nameLines.given ? (
            <span className="shc-player__given">
              {nameLines.given || "PICK"}
            </span>
          ) : null}
          <span className="shc-player__family">
            {nameLines.family || draft.lastName || "PLAYER"}
          </span>
          <span className="shc-player__line">
            {draft.gameLabel || "LAST GAME"} · {shotLine(draft.makes, draft.attempts)}
          </span>
        </button>
        <div
          className="shc-court-wrap"
          style={{
            left: `calc(${court.x} * var(--u))`,
            top: `calc(${court.y} * var(--u))`,
            width: `calc(${court.w} * var(--u))`,
            height: `calc(${court.h} * var(--u))`,
          }}
        >
          <svg
            className="shc-court"
            viewBox={`0 0 ${paths.w} ${paths.h}`}
            role="img"
            aria-label="Half-court shot chart"
          >
            <rect
              x="1.5"
              y="1.5"
              width={paths.w - 3}
              height={paths.h - 3}
              fill="rgba(8,8,10,0.35)"
              stroke="#f4f4f5"
              strokeWidth="3"
            />
            <path d={paths.paint} fill="none" stroke="#f4f4f5" strokeWidth="3" />
            <path
              d={paths.restricted}
              fill="none"
              stroke="#f4f4f5"
              strokeWidth="3"
            />
            <circle
              cx={paths.ftCircle.cx}
              cy={paths.ftCircle.cy}
              r={paths.ftCircle.r}
              fill="none"
              stroke="#f4f4f5"
              strokeWidth="3"
            />
            <circle
              cx={paths.hoopX}
              cy={paths.hoopY}
              r={paths.hoopR}
              fill="none"
              stroke="#facc15"
              strokeWidth="3"
            />
            <path d={paths.three} fill="none" stroke="#f4f4f5" strokeWidth="3" />
            {shots.map((shot, index) => {
              const point = shotToPx(shot, { x: 0, y: 0, w: paths.w, h: paths.h });
              return (
                <circle
                  key={`${shot.x}-${shot.y}-${index}`}
                  className={shot.made ? "is-make" : "is-miss"}
                  cx={point.x}
                  cy={point.y}
                  r={shot.made ? 9 : 8}
                  fill={shot.made ? "#facc15" : "none"}
                  stroke={shot.made ? "#111111" : "#fb7185"}
                  strokeWidth={shot.made ? 1.4 : 2.8}
                />
              );
            })}
          </svg>
          {empty ? (
            <p className="shc-empty">No shot location data</p>
          ) : null}
        </div>
        {empty ? null : (
          <ul
            className="shc-zones"
            aria-label="Shot zone splits"
            style={{
              left: `calc(${rects.zones.x} * var(--u))`,
              top: `calc(${rects.zones.y} * var(--u))`,
              width: `calc(${rects.zones.w} * var(--u))`,
              height: `calc(${rects.zones.h} * var(--u))`,
            }}
          >
            {zones.map((zone) => (
              <li key={zone.id}>
                <span>{zone.label}</span>
                <strong>{formatZoneSplit(zone.makes, zone.attempts)}</strong>
              </li>
            ))}
          </ul>
        )}
        <p
          className="shc-legend"
          style={{ top: `calc(${rects.legendY} * var(--u))` }}
        >
          <span className="is-make">MAKE</span>
          <span className="is-miss">MISS</span>
        </p>
      </article>
    );
  },
);
