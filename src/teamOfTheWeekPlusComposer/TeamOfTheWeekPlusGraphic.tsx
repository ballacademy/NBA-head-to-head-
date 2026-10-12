import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import {
  PLUS_FOOTER,
  PLUS_HEADER_H,
  PLUS_SECTION_H,
  PLUS_STANDOUT_COUNT,
  PLUS_STANDOUT_NAME_H,
  PLUS_STANDOUT_PAD_X,
  PLUS_STARTER_COUNT,
  PLUS_STARTER_NAME_H,
  PLUS_STARTER_PAD_X,
  PLUS_ZOOM_STEP,
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
  showNames?: boolean;
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

const PortraitCell = ({
  slot,
  index,
  showNames,
  onPick,
  onPan,
  onUpload,
  onNameChange,
}: {
  slot: TotwStrip;
  index: number;
  showNames: boolean;
  onPick: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
  onNameChange: (index: number, lastName: string) => void;
}) => {
  const empty = !slot.playerId;
  const label = slot.lastName || slotLabel(index);
  const team = getTeam(slot.teamId);
  return (
    <section className="twp-cell" aria-label={slotLabel(index)}>
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
        <div className="twp-meta">
          {team ? (
            <div className="twp-meta__logo">
              <TeamLogo src={team.logoSrc} label="" fitX={0.88} fitY={0.88} />
            </div>
          ) : null}
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
        </div>
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
    showBa = false,
    showNames = true,
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
        showNames ? "" : "is-names-off",
        composerLookClass(look),
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--u" as string]: `${unit}px`,
          ["--header-h" as string]: String(PLUS_HEADER_H),
          ["--section-h" as string]: String(PLUS_SECTION_H),
          ["--footer-h" as string]: String(PLUS_FOOTER),
          ["--starter-pad" as string]: String(PLUS_STARTER_PAD_X),
          ["--standout-pad" as string]: String(PLUS_STANDOUT_PAD_X),
          ["--starter-name-h" as string]: String(PLUS_STARTER_NAME_H),
          ["--standout-name-h" as string]: String(PLUS_STANDOUT_NAME_H),
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
            onPan={onPan}
            onUpload={onUpload}
            onNameChange={onNameChange}
          />
        ))}
      </div>
      <div className="twp-section">
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
      <div className="twp-bar twp-bar--standouts">
        {Array.from({ length: PLUS_STANDOUT_COUNT }, (_, index) => (
          <PortraitCell
            key={`standout-${index}`}
            slot={standouts[index]!}
            index={PLUS_STARTER_COUNT + index}
            showNames={showNames}
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
