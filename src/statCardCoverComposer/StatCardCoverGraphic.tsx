import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerGradeClass,
  gradedWatermarkOpacity,
} from "../instagramComposer/photoGrade";
import {
  composerWatermarkOpacity,
  parseComposerWatermark,
} from "../instagramComposer/composerWatermark";
import { PlayerNameFade } from "../instagramComposer/PlayerNameFade";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import {
  SCC_BA_INSET,
  SCC_BA_SIZE,
  SCC_DATE_SIZE,
  SCC_FADE_H,
  SCC_MARK,
  SCC_PHOTO_SHIFT,
  SCC_PILL_H,
  SCC_SLOT_COUNT,
  SCC_TITLE_SIZE,
  coverCellRect,
  coverNameMetrics,
  coverSeamXs,
} from "./statCardCoverLayout";
import {
  SCC_DATE_MAX,
  SCC_TITLE_MAX,
  coverSlotName,
  splitCoverTitle,
  type PhotoPan,
  type StatCardCoverDraft,
} from "./statCardCoverState";

interface StatCardCoverGraphicProps {
  draft: StatCardCoverDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  onTitleChange: (value: string) => void;
  onDateLineChange: (value: string) => void;
  onPick: (index: number) => void;
  onHover?: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
  onNameChange: (
    index: number,
    names: { firstName?: string; lastName?: string },
  ) => void;
}

export const StatCardCoverGraphic = forwardRef<
  HTMLElement,
  StatCardCoverGraphicProps
>(function StatCardCoverGraphic(
  {
    draft,
    look = "white",
    purpleFlair = false,
    photoGrade = false,
    exporting = false,
    onTitleChange,
    onDateLineChange,
    onPick,
    onHover,
    onPan,
    onUpload,
    onNameChange,
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const watermark = parseComposerWatermark(draft.watermark);
  const titleLines = splitCoverTitle(draft.title);
  const names = coverNameMetrics();

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
        "scc-board",
        exporting ? "is-exporting" : "",
        composerLookClass(look),
        composerFlairClass(purpleFlair),
        composerGradeClass(photoGrade),
        draft.showGold !== false ? "is-gold" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--u" as string]: `${unit}px`,
          ["--fade-h" as string]: String(SCC_FADE_H),
          ["--photo-shift" as string]: String(SCC_PHOTO_SHIFT),
          ["--title-size" as string]: String(SCC_TITLE_SIZE),
          ["--date-size" as string]: String(SCC_DATE_SIZE),
          ["--pill-h" as string]: String(SCC_PILL_H),
          ["--name-h" as string]: String(names.nameH),
          ["--name-logo" as string]: String(names.logo),
        } as React.CSSProperties
      }
      aria-label="Instagram stat card cover"
    >
      {Array.from({ length: SCC_SLOT_COUNT }, (_, index) => {
        const slot = draft.slots[index]!;
        const cell = coverCellRect(index);
        const empty = !slot.photoSrc;
        const named = Boolean(slot.playerId || coverSlotName(slot));
        const team = getTeam(slot.teamId);
        const label = coverSlotName(slot) || `player ${index + 1}`;
        return (
          <section
            key={`scc-cell-${index}`}
            className="scc-cell"
            style={{
              left: `calc(${cell.x} * var(--u))`,
              top: `calc(${cell.y} * var(--u))`,
              width: `calc(${cell.w} * var(--u))`,
              height: `calc(${cell.h} * var(--u))`,
            }}
            aria-label={`Cover player ${index + 1}`}
            onPointerDown={() => onHover?.(index)}
          >
            <PhotoFrame
              src={slot.photoSrc}
              label={label}
              pan={slot.pan}
              custom={slot.customPhoto}
              empty={empty}
              vignette
              onPan={(pan) => onPan(index, pan)}
              onUpload={(dataUrl) => onUpload(index, dataUrl)}
              onUploadMany={(urls) =>
                urls.forEach((url, offset) => onUpload(index + offset, url))
              }
              onPick={() => onPick(index)}
            />
            {team && watermark !== "off" ? (
              <div
                className="scc-mark"
                aria-hidden="true"
                style={{
                  width: `calc(${SCC_MARK} * var(--u))`,
                  height: `calc(${SCC_MARK} * var(--u))`,
                  opacity: gradedWatermarkOpacity(
                    composerWatermarkOpacity(watermark),
                    photoGrade,
                  ),
                }}
              >
                <TeamLogo src={team.logoSrc} label={team.name} shadow={0} />
              </div>
            ) : null}
            {named ? (
              <PlayerNameFade
                firstName={slot.firstName}
                lastName={slot.lastName}
                teamId={slot.teamId}
                empty={empty}
                givenAria={`Player ${index + 1} first name`}
                familyAria={`Player ${index + 1} last name`}
                onFirstChange={(firstName) =>
                  onNameChange(index, { firstName })
                }
                onLastChange={(lastName) => onNameChange(index, { lastName })}
                onEmptyClick={() => onPick(index)}
              />
            ) : null}
          </section>
        );
      })}
      <div className="scc-top-fade" aria-hidden="true" />
      <div className="scc-lockup-scrim" aria-hidden="true" />
      {coverSeamXs().map((x) => (
        <div
          key={`scc-seam-${x}`}
          className="scc-seam"
          aria-hidden="true"
          style={{ left: `calc(${x} * var(--u))` }}
        />
      ))}
      <header className="scc-lockup">
        <ComposerTitleField
          value={draft.title}
          lines={titleLines}
          ariaLabel="Cover title"
          inputClassName="scc-title-input"
          lineClassName="scc-title-line"
          onChange={onTitleChange}
          maxLength={SCC_TITLE_MAX}
        />
        <input
          className="scc-pill"
          value={draft.dateLine}
          maxLength={SCC_DATE_MAX}
          spellCheck={false}
          aria-label="Cover date"
          placeholder="OCT 14"
          onChange={(event) =>
            onDateLineChange(event.target.value.slice(0, SCC_DATE_MAX))
          }
        />
      </header>
      <div className="scc-swipe" aria-hidden="true">
        <span className="scc-swipe__label">Swipe</span>
        <span className="scc-swipe__chev" />
      </div>
      {draft.showBa !== false ? (
        <img
          className="composer-ba"
          src="/ba-logo-circled.png"
          alt=""
          aria-hidden="true"
          style={{
            top: `calc(${SCC_BA_INSET} * var(--u))`,
            right: `calc(${SCC_BA_INSET} * var(--u))`,
            width: `calc(${SCC_BA_SIZE} * var(--u))`,
            height: `calc(${SCC_BA_SIZE} * var(--u))`,
          }}
        />
      ) : null}
      <span className="scc-frame" aria-hidden="true" />
    </article>
  );
});
