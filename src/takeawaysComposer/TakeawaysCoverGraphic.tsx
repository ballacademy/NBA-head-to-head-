import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerSlotClass,
  useComposerSlotSwap,
} from "../instagramComposer/composerSlotSwap";
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
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import {
  SCC_BA_INSET,
  SCC_BA_SIZE,
  SCC_MARK,
  coverCellRect,
  coverNameMetrics,
  coverSeamXs,
} from "../statCardCoverComposer/statCardCoverLayout";
import {
  TK_DATE_SIZE,
  TK_FADE_H,
  TK_LOCKUP_SCRIM_H,
  TK_PHOTO_SHIFT,
  TK_PILL_H,
  TK_TITLE_SIZE,
} from "./takeawaysLayout";
import {
  TAKEAWAYS_TITLE_MAX,
  splitTakeawaysTitle,
  takeawaysCardName,
  takeawaysCoverViewCards,
  takeawaysWeekPill,
  type PhotoPan,
  type TakeawaysDraft,
} from "./takeawaysState";

interface TakeawaysCoverGraphicProps {
  draft: TakeawaysDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  story?: boolean;
  onTitleChange: (value: string) => void;
  onWeekLineChange: (value: string) => void;
  onPick: (index: number) => void;
  onHover?: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
  onNameChange: (
    index: number,
    names: { firstName?: string; lastName?: string },
  ) => void;
  onSwap?: (from: number, to: number) => void;
}

export const TakeawaysCoverGraphic = forwardRef<
  HTMLElement,
  TakeawaysCoverGraphicProps
>(function TakeawaysCoverGraphic(
  {
    draft,
    look = "white",
    purpleFlair = false,
    photoGrade = false,
    exporting = false,
    story = false,
    onTitleChange,
    onWeekLineChange,
    onPick,
    onHover,
    onPan,
    onUpload,
    onNameChange,
    onSwap,
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const slotSwap = useComposerSlotSwap({
    enabled: !exporting,
    onSwap,
  });
  const watermark = parseComposerWatermark(draft.watermark);
  const titleLines = splitTakeawaysTitle(draft.title, draft.titleStyle);
  const slots = takeawaysCoverViewCards(draft, exporting);
  const slotCount = slots.length;
  const boardH = story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
  const names = coverNameMetrics(slotCount || 3);
  const pill = takeawaysWeekPill(draft);
  const typeOnly = slotCount === 0;
  const goldOn = draft.showGold !== false;

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

  const titleField = (
    <ComposerTitleField
      value={draft.title}
      lines={titleLines}
      ariaLabel="Takeaways title"
      inputClassName="scc-title-input"
      lineClassName="scc-title-line"
      onChange={onTitleChange}
      maxLength={TAKEAWAYS_TITLE_MAX}
    />
  );

  return (
    <article
      ref={setRefs}
      className={[
        "scc-board",
        "tk-cover",
        exporting ? "is-exporting" : "",
        composerLookClass(look),
        composerFlairClass(purpleFlair),
        composerGradeClass(photoGrade),
        goldOn ? "is-gold" : "",
        slotCount >= 4 ? "is-4up" : "",
        typeOnly ? "is-type-only" : "",
        draft.coverField === "metal" ? "is-metal" : "",
        draft.titleStyle === "plate" ? "is-plate" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--u" as string]: `${unit}px`,
          ["--fade-h" as string]: String(TK_FADE_H),
          ["--lockup-scrim-h" as string]: String(TK_LOCKUP_SCRIM_H),
          ["--photo-shift" as string]: String(TK_PHOTO_SHIFT),
          ["--title-size" as string]: String(TK_TITLE_SIZE),
          ["--date-size" as string]: String(TK_DATE_SIZE),
          ["--pill-h" as string]: String(TK_PILL_H),
          ["--name-h" as string]: String(names.nameH),
          ["--name-logo" as string]: String(names.logo),
          ["--name-family" as string]: String(names.family),
          ["--name-given" as string]: String(names.given),
        } as React.CSSProperties
      }
      aria-label="Instagram NBA takeaways cover"
    >
      {slots.map((slot, index) => {
        const cell =
          slotCount <= 1
            ? { x: 0, y: 0, w: GRAPHIC_WIDTH, h: boardH }
            : coverCellRect(index, slotCount, boardH);
        const empty = !slot.photoSrc;
        const named = Boolean(slot.playerId || takeawaysCardName(slot));
        const team = getTeam(slot.teamId);
        const label = takeawaysCardName(slot) || `player ${index + 1}`;
        return (
          <section
            key={`tk-cover-${index}`}
            className={[
              "scc-cell",
              composerSlotClass(index, slotSwap.draggingFrom, slotSwap.dropIndex),
            ]
              .filter(Boolean)
              .join(" ")}
            data-composer-slot={index}
            style={{
              left: `calc(${cell.x} * var(--u))`,
              top: `calc(${cell.y} * var(--u))`,
              width: `calc(${cell.w} * var(--u))`,
              height: `calc(${cell.h} * var(--u))`,
            }}
            aria-label={`Takeaways cover player ${index + 1}`}
            onPointerDown={(event) => {
              onHover?.(index);
              slotSwap.startDrag(index, event);
            }}
          >
            <PhotoFrame
              src={slot.photoSrc}
              label={label}
              pan={slot.pan}
              custom={slot.customPhoto}
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
                onFirstChange={(firstName) => onNameChange(index, { firstName })}
                onLastChange={(lastName) => onNameChange(index, { lastName })}
                onEmptyClick={() => onPick(index)}
              />
            ) : null}
          </section>
        );
      })}
      <div className="scc-top-fade" aria-hidden="true" />
      <div className="scc-lockup-scrim" aria-hidden="true" />
      {typeOnly || slotCount < 2
        ? null
        : coverSeamXs(slotCount).map((x) => (
            <div
              key={`tk-seam-${x}`}
              className="scc-seam"
              aria-hidden="true"
              style={{ left: `calc(${x} * var(--u))` }}
            />
          ))}
      <header className="scc-lockup">
        {draft.titleStyle === "plate" ? (
          <div className="tk-title-plate">{titleField}</div>
        ) : (
          titleField
        )}
        <input
          className="scc-pill"
          value={pill}
          maxLength={32}
          spellCheck={false}
          aria-label="Week pip"
          placeholder="WEEK 1"
          onChange={(event) => onWeekLineChange(event.target.value)}
        />
      </header>
      {draft.showRangeUnderPip ? (
        <p className="tk-range">{draft.rangeLine}</p>
      ) : null}
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
