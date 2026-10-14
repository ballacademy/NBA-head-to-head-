import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PlayerNameFade } from "../instagramComposer/PlayerNameFade";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  PLUS_BA_INSET,
  PLUS_BA_SIZE,
  PLUS_BELOW_HEADER_H,
  PLUS_FOOTER,
  PLUS_HEADER_H,
  PLUS_HEADER_PAD_X,
  PLUS_SECTION_H,
  PLUS_STANDOUT_COUNT,
  PLUS_STANDOUT_LOGO,
  PLUS_STANDOUT_NAME_H,
  PLUS_STANDOUT_PAD_X,
  PLUS_STARTER_COUNT,
  PLUS_STARTER_LOGO,
  PLUS_STARTER_NAME_H,
  PLUS_STARTER_PAD_X,
  PLUS_WEEK_BOTTOM,
  PLUS_WEEK_H,
  PLUS_ZOOM_STEP,
} from "./teamOfTheWeekPlusLayout";
import {
  slotLabel,
  standoutSlots,
  starterSlots,
  stripPlayerName,
  type TotwStrip,
} from "./teamOfTheWeekPlusState";

interface TeamOfTheWeekPlusGraphicProps {
  brand: string;
  week: string;
  starterCaption: string;
  standoutCaption: string;
  slots: TotwStrip[];
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
  showNames?: boolean;
  titlesBelow?: boolean;
  exporting?: boolean;
  onBrandChange: (value: string) => void;
  onWeekChange: (value: string) => void;
  onStarterCaptionChange: (value: string) => void;
  onStandoutCaptionChange: (value: string) => void;
  onPick: (index: number) => void;
  onHover?: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
  onNameChange: (
    index: number,
    names: { firstName?: string; lastName?: string },
  ) => void;
}

const PortraitCell = ({
  slot,
  index,
  showNames,
  onPick,
  onHover,
  onPan,
  onUpload,
  onNameChange,
}: {
  slot: TotwStrip;
  index: number;
  showNames: boolean;
  onPick: (index: number) => void;
  onHover?: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
  onNameChange: (
    index: number,
    names: { firstName?: string; lastName?: string },
  ) => void;
}) => {
  const empty = !slot.photoSrc;
  const label = stripPlayerName(slot) || slotLabel(index);
  return (
    <section
      className="twp-cell"
      aria-label={slotLabel(index)}
      onPointerEnter={() => onHover?.(index)}
    >
      <PhotoFrame
        src={slot.photoSrc}
        label={label}
        pan={slot.pan}
        custom={slot.customPhoto}
        empty={empty}
        zoomStep={PLUS_ZOOM_STEP}
        onPan={(pan) => onPan(index, pan)}
        onUpload={(dataUrl) => onUpload(index, dataUrl)}
        onPick={() => onPick(index)}
      />
      {showNames ? (
        <PlayerNameFade
          firstName={slot.firstName}
          lastName={slot.lastName}
          teamId={slot.teamId}
          empty={empty}
          givenAria={`${slotLabel(index)} first name`}
          familyAria={`${slotLabel(index)} last name`}
          flushLeft={index !== 0 && index !== PLUS_STARTER_COUNT}
          onFirstChange={(firstName) => onNameChange(index, { firstName })}
          onLastChange={(lastName) => onNameChange(index, { lastName })}
          onEmptyClick={() => onPick(index)}
        />
      ) : null}
    </section>
  );
};

export const TeamOfTheWeekPlusGraphic = forwardRef<
  HTMLElement,
  TeamOfTheWeekPlusGraphicProps
>(function TeamOfTheWeekPlusGraphic(
  {
    brand,
    week,
    starterCaption,
    standoutCaption,
    slots,
    look = "white",
    purpleFlair = false,
    showBa = false,
    showNames = true,
    titlesBelow = false,
    exporting = false,
    onBrandChange,
    onWeekChange,
    onHover,
    onStarterCaptionChange,
    onStandoutCaptionChange,
    onPick,
    onPan,
    onUpload,
    onNameChange,
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const starters = starterSlots(slots);
  const standouts = standoutSlots(slots);

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
      className={[
        "twp-board",
        exporting ? "is-exporting" : "",
        showNames ? "" : "is-names-off",
        titlesBelow ? "is-titles-below" : "",
        composerLookClass(look),
        composerFlairClass(purpleFlair),
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--u" as string]: `${unit}px`,
          ["--header-h" as string]: String(
            titlesBelow ? PLUS_BELOW_HEADER_H : PLUS_HEADER_H,
          ),
          ["--header-pad-x" as string]: String(PLUS_HEADER_PAD_X),
          ["--ba-size" as string]: String(PLUS_BA_SIZE),
          ["--ba-inset" as string]: String(PLUS_BA_INSET),
          ["--section-h" as string]: String(PLUS_SECTION_H),
          ["--footer-h" as string]: String(PLUS_FOOTER),
          ["--starter-pad" as string]: String(PLUS_STARTER_PAD_X),
          ["--standout-pad" as string]: String(PLUS_STANDOUT_PAD_X),
          ["--starter-name-h" as string]: String(PLUS_STARTER_NAME_H),
          ["--standout-name-h" as string]: String(PLUS_STANDOUT_NAME_H),
          ["--starter-logo" as string]: String(PLUS_STARTER_LOGO),
          ["--standout-logo" as string]: String(PLUS_STANDOUT_LOGO),
          ["--week-h" as string]: String(PLUS_WEEK_H),
          ["--week-bottom" as string]: String(PLUS_WEEK_BOTTOM),
        } as React.CSSProperties
      }
      aria-label="Instagram team of the week plus graphic"
    >
      {showBa ? (
        <img
          className="composer-ba twp-ba"
          src="/ba-logo-circled.png"
          alt=""
          aria-hidden="true"
        />
      ) : (
        <input
          className="twp-brand"
          value={brand}
          maxLength={24}
          spellCheck={false}
          aria-label="Brand mark"
          onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
        />
      )}
      <header className="twp-header">
        {titlesBelow ? null : (
          <input
            className="twp-title"
            value={starterCaption}
            maxLength={48}
            spellCheck={false}
            aria-label="Team of the Week title"
            onChange={(event) =>
              onComposerTextChange(event, onStarterCaptionChange, 48)
            }
          />
        )}
        <input
          className="twp-week"
          value={week}
          maxLength={32}
          spellCheck={false}
          aria-label="Week or date line"
          placeholder="WEEK"
          onChange={(event) => onWeekChange(event.target.value.slice(0, 32))}
        />
      </header>
      <div className="twp-bar twp-bar--starters">
        {Array.from({ length: PLUS_STARTER_COUNT }, (_, index) => (
          <PortraitCell
            key={`starter-${index}`}
            slot={starters[index]!}
            index={index}
            showNames={showNames}
            onPick={onPick}
            onHover={onHover}
            onPan={onPan}
            onUpload={onUpload}
            onNameChange={onNameChange}
          />
        ))}
      </div>
      {titlesBelow ? (
        <div className="twp-section twp-section--starters">
          <input
            className="twp-section-title twp-section-title--hero"
            value={starterCaption}
            maxLength={48}
            spellCheck={false}
            aria-label="Team of the Week title"
            onChange={(event) =>
              onComposerTextChange(event, onStarterCaptionChange, 48)
            }
          />
        </div>
      ) : (
        <div className="twp-section twp-section--standouts">
          <input
            className="twp-section-title"
            value={standoutCaption}
            maxLength={48}
            spellCheck={false}
            aria-label="Standouts of the Week title"
            onChange={(event) =>
              onComposerTextChange(event, onStandoutCaptionChange, 48)
            }
          />
        </div>
      )}
      <div className="twp-bar twp-bar--standouts">
        {Array.from({ length: PLUS_STANDOUT_COUNT }, (_, index) => (
          <PortraitCell
            key={`standout-${index}`}
            slot={standouts[index]!}
            index={PLUS_STARTER_COUNT + index}
            showNames={showNames}
            onPick={onPick}
            onHover={onHover}
            onPan={onPan}
            onUpload={onUpload}
            onNameChange={onNameChange}
          />
        ))}
      </div>
      {titlesBelow ? (
        <div className="twp-section twp-section--standouts">
          <input
            className="twp-section-title"
            value={standoutCaption}
            maxLength={48}
            spellCheck={false}
            aria-label="Standouts of the Week title"
            onChange={(event) =>
              onComposerTextChange(event, onStandoutCaptionChange, 48)
            }
          />
        </div>
      ) : null}
      <div className="twp-footer" />
    </article>
  );
});
