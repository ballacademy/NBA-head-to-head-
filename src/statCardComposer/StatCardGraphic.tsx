import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerGradeClass,
  gradedWatermarkOpacity,
} from "../instagramComposer/photoGrade";
import {
  composerWatermarkOpacity,
  parseComposerWatermark,
} from "../instagramComposer/composerWatermark";
import { useComposerNameStyle } from "../instagramComposer/composerNameStyle";
import { getTeamColors } from "../lib/teamColors";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import { inkOnHex, statCardStoryType, statCardType } from "./statCardLayout";
import {
  clipStatLabel,
  clipStatMatchup,
  clipStatValue,
  playerName,
  STC_LABEL_MAX,
  STC_MATCHUP_MAX,
  STC_NAME_MAX,
  STC_VALUE_MAX,
  statHighLabel,
  visibleStatCardLines,
  type StatCardDraft,
} from "./statCardState";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";

interface StatCardGraphicProps {
  draft: StatCardDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  story?: boolean;
  onNameChange: (value: string) => void;
  onStatValue: (index: number, value: string) => void;
  onStatLabel: (index: number, value: string) => void;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
  onRemoveStat?: (index: number) => void;
  onMoveStat?: (fromIndex: number, toIndex: number) => void;
  onMatchupChange?: (value: string) => void;
}

export const StatCardGraphic = forwardRef<HTMLElement, StatCardGraphicProps>(
  function StatCardGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      photoGrade = false,
      exporting = false,
      story = false,
      onNameChange,
      onStatValue,
      onStatLabel,
      onPan,
      onUpload,
      onPick,
      onRemoveStat,
      onMoveStat,
      onMatchupChange,
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
    const onMoveStatRef = useRef(onMoveStat);
    onMoveStatRef.current = onMoveStat;
    const dragListenersRef = useRef<(() => void) | null>(null);
    const [unit, setUnit] = useState(1);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
    const [nameStyle] = useComposerNameStyle();
    const [nameFocus, setNameFocus] = useState(false);
    const stats = visibleStatCardLines(draft.stats, exporting);
    const dragEnabled =
      !exporting && Boolean(onMoveStat) && draft.stats.length > 1;
    const team = getTeam(draft.teamId);
    const colors = getTeamColors(draft.teamId ?? "");
    const nameInk = inkOnHex(colors.primary);
    const type = story
      ? statCardStoryType(stats.length)
      : statCardType(stats.length);
    const watermark = parseComposerWatermark(draft.watermark);

    const setRefs = (node: HTMLElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const rowIndexFromPoint = (x: number, y: number) => {
      const node = document.elementFromPoint(x, y);
      if (!(node instanceof Element)) {
        return null;
      }
      const row = node.closest(".stc-row");
      const raw = row?.getAttribute("data-index");
      const index = Number.parseInt(raw ?? "", 10);
      return Number.isInteger(index) ? index : null;
    };

    const stopDragListeners = () => {
      dragListenersRef.current?.();
      dragListenersRef.current = null;
    };

    const startStatDrag = (index: number, event: ReactPointerEvent) => {
      if (!dragEnabled || event.button !== 0) {
        return;
      }
      if (
        event.target instanceof Element &&
        event.target.closest(".stc-row__remove")
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
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }
        if (drag.moved) {
          moveEvent.preventDefault();
          const over = rowIndexFromPoint(moveEvent.clientX, moveEvent.clientY);
          setDropIndex(over != null && over !== drag.from ? over : null);
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
        const toIndex = rowIndexFromPoint(endEvent.clientX, endEvent.clientY);
        const move = onMoveStatRef.current;
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
        return () => stopDragListeners();
      }
      const observer = new ResizeObserver(sync);
      observer.observe(node);
      return () => {
        observer.disconnect();
        stopDragListeners();
      };
    }, []);

    return (
      <article
        ref={setRefs}
        className={[
          "stc-board",
          exporting ? "is-exporting" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
          composerGradeClass(photoGrade),
          story ? "is-story" : "",
          !story && draft.statsLeft ? "is-stats-left" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--team-color" as string]: colors.primary,
            ["--name-ink" as string]: nameInk,
            ["--stc-value" as string]: String(type.value),
            ["--stc-label" as string]: String(type.label),
            ["--stc-gap" as string]: String(type.gap),
            ["--stc-count" as string]: String(Math.max(1, stats.length)),
          } as React.CSSProperties
        }
        aria-label="Instagram stat card"
      >
        <div className="stc-photo">
          <PhotoFrame
            src={draft.photoSrc}
            label={playerName(draft, nameStyle) || "stat card photo"}
            pan={draft.pan}
            custom={draft.customPhoto}
            empty={!draft.photoSrc}
            vignette
            onPan={onPan}
            onUpload={onUpload}
            onPick={onPick}
          />
        </div>
        {draft.showBa !== false ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        <div className="stc-stats">
          {team && watermark !== "off" ? (
            <div
              className="stc-mark"
              aria-hidden="true"
              style={{
                opacity: gradedWatermarkOpacity(
                  composerWatermarkOpacity(watermark),
                  photoGrade,
                ),
              }}
            >
              <TeamLogo src={team.logoSrc} label={team.name} shadow={0} />
            </div>
          ) : null}
          {stats.map((line, index) => (
            <div
              key={`${line.key}-${index}`}
              data-index={index}
              className={[
                "stc-row",
                dragEnabled ? "stc-row--movable" : "",
                draggingFrom === index ? "stc-row--dragging" : "",
                dropIndex === index ? "is-drop" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onPointerDown={(event) => startStatDrag(index, event)}
            >
              {dragEnabled ? (
                <span className="stc-row__grip" aria-hidden="true" />
              ) : null}
              {onRemoveStat && draft.stats.length > 1 ? (
                <button
                  type="button"
                  className="stc-row__remove"
                  aria-label={`Remove ${line.label} slot`}
                  onClick={() => onRemoveStat(index)}
                >
                  Remove
                </button>
              ) : null}
              {line.high ? (
                <span
                  className={`stc-high is-${line.high}`}
                  aria-label={
                    line.high === "career" ? "Career high" : "Season high"
                  }
                >
                  {statHighLabel(line.high)}
                </span>
              ) : null}
              <input
                className="stc-value"
                value={line.value}
                maxLength={STC_VALUE_MAX}
                aria-label={`${line.label} value`}
                placeholder="—"
                onChange={(event) =>
                  onStatValue(index, clipStatValue(event.target.value))
                }
              />
              <input
                className="stc-label"
                value={line.label}
                maxLength={STC_LABEL_MAX}
                aria-label="Stat label"
                onChange={(event) =>
                  onStatLabel(index, clipStatLabel(event.target.value))
                }
              />
            </div>
          ))}
          {draft.showMatchup ? (
            <div className="stc-matchup">
              <input
                className="stc-matchup__line"
                value={draft.matchup ?? ""}
                maxLength={STC_MATCHUP_MAX}
                placeholder="W vs OKC 111–109"
                aria-label="Game matchup"
                onChange={(event) =>
                  onMatchupChange?.(clipStatMatchup(event.target.value))
                }
              />
            </div>
          ) : null}
        </div>
        <div className="stc-name-bar">
          <input
            className="stc-name"
            value={
              nameFocus
                ? playerName(draft, "full")
                : playerName(draft, nameStyle)
            }
            maxLength={STC_NAME_MAX}
            placeholder="PLAYER"
            aria-label="Player name"
            onFocus={() => setNameFocus(true)}
            onBlur={() => setNameFocus(false)}
            onChange={(event) => onNameChange(event.target.value)}
          />
          {team ? (
            <div className="stc-logo">
              <TeamLogo src={team.logoSrc} label={team.name} shadow={0} />
            </div>
          ) : null}
        </div>
        <span className="stc-hairline" aria-hidden="true" />
        <span className="stc-frame" aria-hidden="true" />
      </article>
    );
  },
);
