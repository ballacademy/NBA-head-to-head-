import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import {
  BANNER_SHAPE,
  BANNER_VIEW,
  brandEmTop,
} from "../standingsComposer/bannerLayout";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { PlayerHeadshot } from "../tierListComposer/PlayerHeadshot";
import { fittedCellNames } from "../instagramComposer/nameFit";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import {
  ET_CELL_GAP,
  everyTeamGrid,
} from "./everyTeamLayout";
import {
  displayedTeams,
  slotIndexForTeam,
  splitEveryTeamTitle,
  type EveryTeamSlots,
} from "./everyTeamState";
import {
  everyTeamCurrentSeason,
  formatSeasonShort,
  getRosterPlayer,
  isMissingSeason,
  seasonForTeam,
  teamLogoSrc,
} from "./historicalRosters";

interface EveryTeamGraphicProps {
  brand: string;
  title: string;
  slots: EveryTeamSlots;
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
  ranked?: boolean;
  rankedOrder?: string[];
  showNames?: boolean;
  showHistoricalLogos?: boolean;
  season?: string;
  cellSeasons?: Record<string, string>;
  activeIndex: number | null;
  exporting?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onSelectSlot: (index: number) => void;
  onClearSlot: (index: number) => void;
  onMoveSlots?: (fromIndex: number, toIndex: number) => void;
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
      look = "white",
      purpleFlair = false,
      showBa = false,
      ranked = false,
      rankedOrder,
      showNames = false,
      showHistoricalLogos = false,
      season,
      cellSeasons,
      activeIndex,
      exporting = false,
      onBrandChange,
      onTitleChange,
      onSelectSlot,
      onClearSlot,
      onMoveSlots,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const dragRef = useRef<{
      from: number;
      x: number;
      y: number;
      moved: boolean;
    } | null>(null);
    const skipClickRef = useRef(false);
    const onMoveSlotsRef = useRef(onMoveSlots);
    onMoveSlotsRef.current = onMoveSlots;
    const dragListenersRef = useRef<(() => void) | null>(null);
    const [unit, setUnit] = useState(0.4);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
    const titleLines = splitEveryTeamTitle(title);
    const grid = everyTeamGrid(1);
    const teams = displayedTeams(ranked, rankedOrder);
    const dragEnabled = ranked && !exporting && Boolean(onMoveSlots);

    const cellIndexFromPoint = (x: number, y: number) => {
      const node = document.elementFromPoint(x, y);
      if (!(node instanceof Element)) {
        return null;
      }
      const cell = node.closest(".et-cell");
      const raw = cell?.getAttribute("data-index");
      const index = Number.parseInt(raw ?? "", 10);
      return Number.isInteger(index) ? index : null;
    };

    const stopDragListeners = () => {
      dragListenersRef.current?.();
      dragListenersRef.current = null;
    };

    const startRankedDrag = (index: number, event: ReactPointerEvent) => {
      if (!dragEnabled || event.button !== 0) {
        return;
      }
      if (
        event.target instanceof Element &&
        event.target.closest(".et-cell__clear")
      ) {
        return;
      }
      stopDragListeners();
      dragRef.current = {
        from: index,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };

      const onMove = (moveEvent: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) {
          return;
        }
        if (
          !drag.moved &&
          Math.hypot(moveEvent.clientX - drag.x, moveEvent.clientY - drag.y) > 8
        ) {
          drag.moved = true;
          setDraggingFrom(drag.from);
        }
        if (drag.moved) {
          moveEvent.preventDefault();
          setDropIndex(
            cellIndexFromPoint(moveEvent.clientX, moveEvent.clientY),
          );
        }
      };

      const finish = (endEvent: PointerEvent) => {
        stopDragListeners();
        const drag = dragRef.current;
        dragRef.current = null;
        setDropIndex(null);
        setDraggingFrom(null);
        if (!drag?.moved) {
          return;
        }
        skipClickRef.current = true;
        window.setTimeout(() => {
          skipClickRef.current = false;
        }, 0);
        const toIndex = cellIndexFromPoint(endEvent.clientX, endEvent.clientY);
        const move = onMoveSlotsRef.current;
        if (move && toIndex != null && toIndex !== drag.from) {
          move(drag.from, toIndex);
        }
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
      dragListenersRef.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
      };
    };

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

    useLayoutEffect(() => () => stopDragListeners(), []);

    return (
      <article
        ref={setRefs}
        className={[
          "ig-board",
          "et-board",
          ranked ? "is-ranked" : "",
          exporting ? "is-exporting" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
        ]
          .filter(Boolean)
          .join(" ")}
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
        {showBa ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        <header className="ig-header">
          <div className="ig-brand-slot" aria-hidden="true" />
          <input
            className="ig-brand"
            value={brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand label"
            onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
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
                stroke="currentColor"
                strokeWidth="7"
                strokeLinejoin="miter"
              />
            </svg>
            <div className="et-title-block">
              <ComposerTitleField
                value={title}
                lines={titleLines}
                ariaLabel="Every-team title"
                inputClassName="et-title-input"
                lineClassName="et-title-line"
                onChange={onTitleChange}
              />
            </div>
          </div>
        </header>
        <div className="et-grid">
          {teams.map((team, index) => {
            const stored = slots[slotIndexForTeam(team.id)] ?? null;
            const cellSeason = seasonForTeam(
              team.id,
              season ?? everyTeamCurrentSeason(),
              cellSeasons,
            );
            const missing = isMissingSeason(team.id, cellSeason);
            const shown = getRosterPlayer(team.id, cellSeason, stored);
            const names = shown ? splitPlayerName(shown.name) : null;
            const caption = names
              ? fittedCellNames(
                  names.firstName,
                  names.lastName || shown!.name,
                  grid.cell * 0.84,
                  14,
                  11,
                )
              : null;
            const rank = index + 1;
            const overridden = Boolean(cellSeasons?.[team.id]);
            const showYear =
              overridden || cellSeason !== everyTeamCurrentSeason();
            const noStats = Boolean(shown && shown.pts == null);
            return (
              <div
                key={team.id}
                data-index={index}
                data-team={team.id}
                className={[
                  "et-cell",
                  shown ? "et-cell--filled" : "",
                  missing ? "et-cell--missing" : "",
                  ranked ? "et-cell--ranked" : "",
                  dragEnabled ? "et-cell--movable" : "",
                  draggingFrom === index ? "et-cell--dragging" : "",
                  activeIndex === index ? "is-active" : "",
                  dropIndex === index ? "is-drop" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  {
                    ["--cell-from" as string]: team.cellFrom,
                    ["--cell-to" as string]: team.cellTo,
                  } as React.CSSProperties
                }
                onPointerDown={(event) => startRankedDrag(index, event)}
              >
                <button
                  type="button"
                  className="et-cell__hit"
                  onClick={() => {
                    if (skipClickRef.current) {
                      return;
                    }
                    onSelectSlot(index);
                  }}
                  aria-label={
                    missing
                      ? `${team.name}, ${cellSeason} roster unavailable`
                      : ranked
                        ? shown
                          ? `Rank ${rank}, ${team.name}, ${shown.name}, ${cellSeason}. Change player`
                          : `Rank ${rank}, ${team.name}, empty ${cellSeason}. Pick a player`
                        : shown
                          ? `${team.name}, ${shown.name}, ${cellSeason}. Change player`
                          : `${team.name}, empty ${cellSeason}. Pick a player`
                  }
                />
                <div className="et-cell__backdrop" aria-hidden="true">
                  <TeamLogo
                    src={teamLogoSrc(team.id, cellSeason, showHistoricalLogos)}
                    label={team.id}
                    shadow={0}
                    cover
                  />
                </div>
                {shown ? (
                  <PlayerHeadshot
                    className="et-headshot"
                    src={shown.headshotUrl}
                    label={shown.id}
                  />
                ) : null}
                {ranked ? (
                  <span className="et-cell__rank" aria-hidden="true">
                    {rank}
                  </span>
                ) : null}
                {dragEnabled ? (
                  <span className="et-cell__handle" aria-hidden="true" />
                ) : null}
                {missing ? (
                  <span className="et-cell__missing">
                    No {formatSeasonShort(cellSeason)} roster
                  </span>
                ) : null}
                {showYear && !missing ? (
                  <span
                    className={
                      overridden ? "et-cell__year is-override" : "et-cell__year"
                    }
                  >
                    {formatSeasonShort(cellSeason)}
                  </span>
                ) : null}
                {exporting || !noStats ? null : (
                  <span className="et-cell__nostats">No stats</span>
                )}
                {showNames && shown && caption ? (
                  <span className="et-cell__name">
                    {caption.firstName ? (
                      <span className="et-cell__given">{caption.firstName}</span>
                    ) : null}
                    <span className="et-cell__family">{caption.lastName}</span>
                  </span>
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
                    onPointerDown={(event) => event.stopPropagation()}
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
