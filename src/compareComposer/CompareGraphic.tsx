import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  composerSlotClass,
  useComposerSlotSwap,
} from "../instagramComposer/composerSlotSwap";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import {
  composerWatermarkOpacity,
  parseComposerWatermark,
} from "../instagramComposer/composerWatermark";
import { useComposerNameStyle } from "../instagramComposer/composerNameStyle";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import { CMP_BRAND, compareStatType } from "./compareLayout";
import {
  compareSideCaption,
  compareWinner,
  leadingSide,
  visibleCompareStats,
  type CompareDraft,
  type CompareSide,
  type PhotoPan,
} from "./compareState";

interface CompareGraphicProps {
  draft: CompareDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  story?: boolean;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onStatsLabelChange: (value: string) => void;
  onStatChange: (
    index: number,
    patch: { label?: string; left?: string; right?: string },
  ) => void;
  onPick: (side: 0 | 1) => void;
  onPan: (side: 0 | 1, pan: PhotoPan) => void;
  onUpload: (side: 0 | 1, dataUrl: string) => void;
  onRemoveStat?: (index: number) => void;
  onMoveStat?: (fromIndex: number, toIndex: number) => void;
  onSwap?: (from: number, to: number) => void;
}

const sideLabel = (side: CompareSide, fallback: string) =>
  compareSideCaption(side) || fallback;

export const CompareGraphic = forwardRef<HTMLElement, CompareGraphicProps>(
  function CompareGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      photoGrade = false,
      exporting = false,
      story = false,
      onTitleChange,
      onSubtitleChange,
      onStatsLabelChange,
      onStatChange,
      onPick,
      onPan,
      onUpload,
      onRemoveStat,
      onMoveStat,
      onSwap,
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
    const stats = visibleCompareStats(draft.stats, exporting);
    const type = compareStatType(stats.length || draft.stats.length);
    const watermark = parseComposerWatermark(draft.watermark);
    const hasSub = Boolean(draft.subtitle.trim());
    const showBa = draft.showBa !== false;
    const winner =
      draft.showWinner === true ? compareWinner(draft.stats) : null;
    const dragEnabled =
      !exporting && Boolean(onMoveStat) && draft.stats.length > 1;
    const slotSwap = useComposerSlotSwap({
      enabled: !exporting,
      onSwap,
    });

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
      const row = node.closest(".cmp-stat");
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
        event.target.closest(".cmp-stat__remove")
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
          "cmp-board",
          exporting ? "is-exporting" : "",
          hasSub ? "has-sub" : "",
          story ? "is-story" : "",
          showBa ? "" : "is-ba-off",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
          composerGradeClass(photoGrade),
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--cmp-value" as string]: String(type.value),
            ["--cmp-label" as string]: String(type.label),
            ["--cmp-rule" as string]: String(type.rule),
            ["--cmp-stroke" as string]: String(type.stroke),
          } as React.CSSProperties
        }
        aria-label="Instagram comparison graphic"
      >
        {showBa ? (
          <p className="cmp-brand" aria-hidden="true">
            {CMP_BRAND}
          </p>
        ) : null}
        <div className="cmp-title-plate">
          <input
            className="cmp-title"
            value={draft.title}
            maxLength={36}
            spellCheck={false}
            aria-label="Comparison title"
            onChange={(event) =>
              onComposerTextChange(event, onTitleChange, 36)
            }
          />
        </div>
        <div className="cmp-photos">
          {([0, 1] as const).map((side) => {
            const person = draft.sides[side]!;
            const caption = compareSideCaption(person, nameStyle);
            const team = getTeam(person.teamId);
            return (
              <section
                key={`cmp-side-${side}`}
                className={[
                  "cmp-photo",
                  side === 0 ? "is-left" : "is-right",
                  winner === side ? "is-winner" : "",
                  composerSlotClass(side, slotSwap.draggingFrom, slotSwap.dropIndex),
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-composer-slot={side}
                aria-label={side === 0 ? "Left photo" : "Right photo"}
                style={{ gridColumn: side === 0 ? 1 : 3 }}
                onPointerDown={(event) => slotSwap.startDrag(side, event)}
              >
                {team && watermark !== "off" ? (
                  <div
                    className="cmp-mark"
                    aria-hidden="true"
                    style={{ opacity: composerWatermarkOpacity(watermark) }}
                  >
                    <TeamLogo src={team.logoSrc} label={team.name} shadow={0} />
                  </div>
                ) : null}
                <PhotoFrame
                  src={person.photoSrc}
                  label={sideLabel(person, side === 0 ? "left" : "right")}
                  pan={person.pan}
                  custom={person.customPhoto}
                  empty={!person.photoSrc}
                  vignette
                  slotSwapEnabled={!exporting && Boolean(onSwap)}
                  onPan={(pan) => onPan(side, pan)}
                  onUpload={(dataUrl) => onUpload(side, dataUrl)}
                  onPick={() => onPick(side)}
                />
                {winner === side ? (
                  <span className="cmp-winner" aria-hidden="true">
                    W
                  </span>
                ) : null}
                {caption ? (
                  <p className="cmp-photo-name">{caption}</p>
                ) : null}
              </section>
            );
          })}
          <div className="cmp-stats">
            <input
              className="cmp-stats__label"
              value={draft.statsLabel}
              maxLength={24}
              aria-label="Stats column label"
              onChange={(event) =>
                onStatsLabelChange(event.target.value.slice(0, 24))
              }
            />
            {stats.map((stat, index) => {
              const lead = leadingSide(stat.left, stat.right);
              const empty = !stat.left.trim() && !stat.right.trim();
              return (
                <div
                  key={`cmp-stat-${stat.key}-${index}`}
                  data-index={index}
                  className={[
                    "cmp-stat",
                    empty ? "is-empty" : "",
                    dragEnabled ? "cmp-stat--movable" : "",
                    draggingFrom === index ? "cmp-stat--dragging" : "",
                    dropIndex === index ? "is-drop" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onPointerDown={(event) => startStatDrag(index, event)}
                >
                  {dragEnabled ? (
                    <span className="cmp-stat__grip" aria-hidden="true" />
                  ) : null}
                  {onRemoveStat && draft.stats.length > 1 && !exporting ? (
                    <button
                      type="button"
                      className="cmp-stat__remove"
                      aria-label={`Remove ${stat.label} slot`}
                      onClick={() => onRemoveStat(index)}
                    >
                      Remove
                    </button>
                  ) : null}
                  <div
                    className={[
                      "cmp-stat__side",
                      "is-left",
                      lead === 0 ? "is-lead" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <input
                      className="cmp-stat__val"
                      value={stat.left}
                      maxLength={8}
                      aria-label={`Left ${stat.label || "stat"}`}
                      onChange={(event) =>
                        onStatChange(index, {
                          left: event.target.value.slice(0, 8),
                        })
                      }
                    />
                    <input
                      className="cmp-stat__unit"
                      value={stat.label}
                      maxLength={8}
                      aria-label={`Left ${stat.label || "stat"} label`}
                      onChange={(event) =>
                        onStatChange(index, {
                          label: event.target.value.slice(0, 8),
                        })
                      }
                    />
                  </div>
                  <span className="cmp-rule" aria-hidden="true" />
                  <div
                    className={[
                      "cmp-stat__side",
                      "is-right",
                      lead === 1 ? "is-lead" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <input
                      className="cmp-stat__val"
                      value={stat.right}
                      maxLength={8}
                      aria-label={`Right ${stat.label || "stat"}`}
                      onChange={(event) =>
                        onStatChange(index, {
                          right: event.target.value.slice(0, 8),
                        })
                      }
                    />
                    <span className="cmp-stat__unit" aria-hidden="true">
                      {stat.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div
          className={[
            "cmp-sub-plate",
            draft.subtitle.trim() ? "" : "is-empty",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <input
            className="cmp-sub"
            value={draft.subtitle}
            maxLength={48}
            spellCheck={false}
            aria-label="Comparison subtitle"
            placeholder=""
            onChange={(event) =>
              onComposerTextChange(event, onSubtitleChange, 48)
            }
          />
        </div>
      </article>
    );
  },
);
