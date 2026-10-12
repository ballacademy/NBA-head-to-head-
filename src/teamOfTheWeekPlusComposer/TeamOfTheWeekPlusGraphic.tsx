import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  PLUS_CAPTION_H,
  PLUS_CHROME_H,
  PLUS_FOOTER,
  PLUS_ROW_GAP,
  PLUS_STANDOUT_COUNT,
  PLUS_STANDOUT_NAME_H,
  PLUS_STANDOUT_PAD_X,
  PLUS_STARTER_COUNT,
  PLUS_STARTER_NAME_H,
  PLUS_STARTER_PAD_X,
} from "./teamOfTheWeekPlusLayout";
import {
  slotLabel,
  standoutSlots,
  starterSlots,
  type TotwStrip,
} from "./teamOfTheWeekPlusState";

interface TeamOfTheWeekPlusGraphicProps {
  brand: string;
  week: string;
  starterCaption: string;
  standoutCaption: string;
  slots: TotwStrip[];
  look?: ComposerLook;
  showBa?: boolean;
  exporting?: boolean;
  onBrandChange: (value: string) => void;
  onWeekChange: (value: string) => void;
  onStarterCaptionChange: (value: string) => void;
  onStandoutCaptionChange: (value: string) => void;
  onPick: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
  onNameChange: (index: number, lastName: string) => void;
}

const CaptionRow = ({
  value,
  ariaLabel,
  onChange,
  bench = false,
}: {
  value: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  bench?: boolean;
}) => (
  <div className={["twp-caption-row", bench ? "is-bench" : ""].filter(Boolean).join(" ")}>
    <input
      className="twp-caption"
      value={value}
      maxLength={36}
      spellCheck={false}
      aria-label={ariaLabel}
      onChange={(event) => onComposerTextChange(event, onChange, 36)}
    />
    <span className="twp-caption-rule" aria-hidden="true" />
  </div>
);

const PortraitCell = ({
  slot,
  index,
  onPick,
  onPan,
  onUpload,
  onNameChange,
}: {
  slot: TotwStrip;
  index: number;
  onPick: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
  onNameChange: (index: number, lastName: string) => void;
}) => {
  const empty = !slot.playerId;
  const label = slot.lastName || slotLabel(index);
  return (
    <section className="twp-cell" aria-label={slotLabel(index)}>
      <PhotoFrame
        src={slot.photoSrc}
        label={label}
        pan={slot.pan}
        custom={slot.customPhoto}
        empty={empty}
        onPan={(pan) => onPan(index, pan)}
        onUpload={(dataUrl) => onUpload(index, dataUrl)}
        onPick={() => onPick(index)}
      />
      <input
        className="twp-name"
        value={slot.lastName}
        maxLength={18}
        placeholder={empty ? "" : "NAME"}
        aria-label={`${slotLabel(index)} name`}
        onChange={(event) =>
          onNameChange(index, event.target.value.slice(0, 18))
        }
        onClick={() => {
          if (empty) {
            onPick(index);
          }
        }}
      />
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
    showBa = false,
    exporting = false,
    onBrandChange,
    onWeekChange,
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
        composerLookClass(look),
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--u" as string]: `${unit}px`,
          ["--chrome-h" as string]: String(PLUS_CHROME_H),
          ["--caption-h" as string]: String(PLUS_CAPTION_H),
          ["--row-gap" as string]: String(PLUS_ROW_GAP),
          ["--footer-h" as string]: String(PLUS_FOOTER),
          ["--starter-pad" as string]: String(PLUS_STARTER_PAD_X),
          ["--standout-pad" as string]: String(PLUS_STANDOUT_PAD_X),
          ["--starter-name-h" as string]: String(PLUS_STARTER_NAME_H),
          ["--standout-name-h" as string]: String(PLUS_STANDOUT_NAME_H),
        } as React.CSSProperties
      }
      aria-label="Instagram team of the week plus graphic"
    >
      <header className="twp-chrome">
        {showBa ? (
          <img
            className="twp-ba"
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
            aria-label="Brand label"
            onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
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
      <CaptionRow
        value={starterCaption}
        ariaLabel="Team of the Week row caption"
        onChange={onStarterCaptionChange}
      />
      <div className="twp-bar twp-bar--starters">
        {Array.from({ length: PLUS_STARTER_COUNT }, (_, index) => (
          <PortraitCell
            key={`starter-${index}`}
            slot={starters[index]!}
            index={index}
            onPick={onPick}
            onPan={onPan}
            onUpload={onUpload}
            onNameChange={onNameChange}
          />
        ))}
      </div>
      <div className="twp-row-gap" />
      <CaptionRow
        value={standoutCaption}
        ariaLabel="Standouts row caption"
        onChange={onStandoutCaptionChange}
        bench
      />
      <div className="twp-bar twp-bar--standouts">
        {Array.from({ length: PLUS_STANDOUT_COUNT }, (_, index) => (
          <PortraitCell
            key={`standout-${index}`}
            slot={standouts[index]!}
            index={PLUS_STARTER_COUNT + index}
            onPick={onPick}
            onPan={onPan}
            onUpload={onUpload}
            onNameChange={onNameChange}
          />
        ))}
      </div>
      <div className="twp-footer" />
    </article>
  );
});
