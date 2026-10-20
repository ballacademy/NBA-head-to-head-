import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerSlotClass,
  useComposerSlotSwap,
} from "../instagramComposer/composerSlotSwap";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerFlairClass,
  composerLookClass,
  teamHairlineColor,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PlayerNameFade } from "../instagramComposer/PlayerNameFade";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TOTW_NAME_H, TOTW_NAME_LOGO } from "./teamOfTheWeekLayout";
import {
  splitTotwTitle,
  totwPhotoPan,
  TOTW_STRIP_COUNT,
  type PhotoPan,
  type TotwStrip,
} from "./teamOfTheWeekState";

interface TeamOfTheWeekGraphicProps {
  brand: string;
  title: string;
  week: string;
  strips: TotwStrip[];
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  showBa?: boolean;
  showNames?: boolean;
  showTeamHairline?: boolean;
  exporting?: boolean;
  story?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onWeekChange: (value: string) => void;
  onPick: (index: number) => void;
  onHover?: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
  onNameChange: (
    index: number,
    names: { firstName?: string; lastName?: string },
  ) => void;
  onSwap?: (from: number, to: number) => void;
  stripStats?: string[];
}

export const TeamOfTheWeekGraphic = forwardRef<
  HTMLElement,
  TeamOfTheWeekGraphicProps
>(function TeamOfTheWeekGraphic(
  {
    brand,
    title,
    week,
    strips,
    look = "white",
    purpleFlair = false,
    photoGrade = false,
    showBa = false,
    showNames = false,
    showTeamHairline = true,
    exporting = false,
    story = false,
    onBrandChange,
    onTitleChange,
    onWeekChange,
    onPick,
    onHover,
    onPan,
    onUpload,
    onNameChange,
    onSwap,
    stripStats = [],
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const titleLines = splitTotwTitle(title);
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
        "totw-board",
        story ? "is-story" : "",
        exporting ? "is-exporting" : "",
        showNames ? "" : "is-names-off",
        showTeamHairline ? "is-hairline" : "",
        composerLookClass(look),
        composerFlairClass(purpleFlair),
        composerGradeClass(photoGrade),
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--u" as string]: `${unit}px`,
          ["--name-h" as string]: String(TOTW_NAME_H),
          ["--name-logo" as string]: String(TOTW_NAME_LOGO),
        } as React.CSSProperties
      }
      aria-label="Instagram team of the week graphic"
    >
      {showBa ? (
        <img
          className="composer-ba"
          src="/ba-logo-circled.png"
          alt=""
          aria-hidden="true"
        />
      ) : null}
      <header className="totw-header">
        {showBa ? null : (
        <input
          className="totw-brand"
          value={brand}
          maxLength={24}
          spellCheck={false}
          aria-label="Brand label"
          onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
        />
        )}
      </header>
      <div className="totw-strips">
        {Array.from({ length: TOTW_STRIP_COUNT }, (_, index) => {
          const strip = strips[index]!;
          const empty = !strip.photoSrc;
          const label = strip.lastName || `player ${index + 1}`;
          const hair = showTeamHairline
            ? teamHairlineColor(strip.teamId, look)
            : null;
          return (
            <section
              key={`totw-strip-${index}`}
              data-composer-slot={index}
              className={[
                "totw-strip",
                hair ? "has-hairline" : "",
                composerSlotClass(index, slotSwap.draggingFrom, slotSwap.dropIndex),
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                hair
                  ? ({ ["--team-hairline" as string]: hair } as React.CSSProperties)
                  : undefined
              }
              aria-label={`Player strip ${index + 1}`}
              onPointerEnter={() => onHover?.(index)}
              onPointerDown={(event) => slotSwap.startDrag(index, event)}
            >
              <PhotoFrame
                src={strip.photoSrc}
                label={label}
                pan={totwPhotoPan(strip, story)}
                custom={strip.customPhoto}
                empty={empty}
                vignette
                slotSwapEnabled={!exporting && Boolean(onSwap)}
                onPan={(pan) => onPan(index, pan)}
                onUpload={(dataUrl) => onUpload(index, dataUrl)}
                onUploadMany={(urls) =>
                  urls.forEach((url, offset) => onUpload(index + offset, url))
                }
                onPick={() => onPick(index)}
              />
              {showNames ? (
                <PlayerNameFade
                  firstName={strip.firstName}
                  lastName={strip.lastName}
                  teamId={strip.teamId}
                  empty={empty}
                  givenAria={`Player ${index + 1} first name`}
                  familyAria={`Player ${index + 1} last name`}
                  onFirstChange={(firstName) =>
                    onNameChange(index, { firstName })
                  }
                  onLastChange={(lastName) =>
                    onNameChange(index, { lastName })
                  }
                  stat={stripStats[index] ?? ""}
                  onEmptyClick={() => onPick(index)}
                />
              ) : null}
            </section>
          );
        })}
      </div>
      <footer className="totw-footer">
        <div className="totw-title-plate">
          <div className="totw-title-block">
            <ComposerTitleField
              value={title}
              lines={titleLines}
              ariaLabel="Team of the week title"
              inputClassName="totw-title-input"
              lineClassName="totw-title-line"
              onChange={onTitleChange}
            />
          </div>
        </div>
        <input
          className="totw-week-notch"
          value={week}
          maxLength={32}
          spellCheck={false}
          aria-label="Week or date line"
          onChange={(event) =>
            onWeekChange(event.target.value.slice(0, 32))
          }
        />
      </footer>
    </article>
  );
});
