import { forwardRef, useLayoutEffect, useRef, useState } from "react";
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
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { PhotoFrame } from "./PhotoFrame";
import { POTD_STAT_FIELDS, statsFillForTeam } from "./playerOfTheDayLayout";
import {
  potdResultFromDisplay,
  potdResultLineDisplay,
  potdResultOutcome,
  potdSlotLabel,
  splitPotdTitle,
  type PhotoPan,
  type PotdCard,
} from "./playerOfTheDayState";
import type { LastGameStats } from "./lastGame";

interface PlayerOfTheDayGraphicProps {
  brand: string;
  title: string;
  date: string;
  cards: PotdCard[];
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  showBa?: boolean;
  wlColor?: boolean;
  exporting?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPick: (index: number) => void;
  onTotalChange: (index: number, value: string) => void;
  onStatsChange: (index: number, stats: LastGameStats) => void;
  onResultChange: (index: number, value: string) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
}

export const PlayerOfTheDayGraphic = forwardRef<
  HTMLElement,
  PlayerOfTheDayGraphicProps
>(function PlayerOfTheDayGraphic(
  {
    brand,
    title,
    date,
    cards,
    look = "white",
    purpleFlair = false,
    photoGrade = false,
    showBa = false,
    wlColor = false,
    exporting = false,
    onBrandChange,
    onTitleChange,
    onDateChange,
    onPick,
    onTotalChange,
    onStatsChange,
    onResultChange,
    onPan,
    onUpload,
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const [nameStyle] = useComposerNameStyle();
  const titleLines = splitPotdTitle(title);

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
      className={["pod-board", exporting ? "is-exporting" : "", cards.length === 3 ? "is-3up" : "", composerLookClass(look), composerFlairClass(purpleFlair), composerGradeClass(photoGrade)]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--u" as string]: `${unit}px` } as React.CSSProperties}
      aria-label="Instagram player of the day graphic"
    >
      {showBa ? (
        <img
          className="composer-ba"
          src="/ba-logo-circled.png"
          alt=""
          aria-hidden="true"
        />
      ) : null}
      <header className="pod-header">
        {showBa ? null : (
        <input
          className="pod-brand"
          value={brand}
          maxLength={24}
          spellCheck={false}
          aria-label="Brand label"
          onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
        />
        )}
        <div className="pod-title-plate">
          <div className="pod-title-block">
            <ComposerTitleField
              value={title}
              lines={titleLines}
              ariaLabel="Player of the day title"
              inputClassName="pod-title-input"
              lineClassName="pod-title-line"
              onChange={onTitleChange}
            />
          </div>
        </div>
        <input
          className="pod-date-notch"
          value={`DATE: ${date}`}
          maxLength={24}
          spellCheck={false}
          aria-label="Date"
          onChange={(event) => {
            const raw = event.target.value.replace(/^date:\s*/i, "");
            onDateChange(raw.slice(0, 16));
          }}
        />
      </header>
      <div className="pod-cards">
        {cards.map((card, index) => {
          const team = getTeam(card.teamId);
          const empty = !card.photoSrc;
          const lines = composerNameLines(
            card.firstName,
            card.lastName,
            nameStyle,
          );
          return (
            <section
              key={`pod-card-${index}`}
              className="pod-card"
              style={
                {
                  ["--team-fill" as string]: statsFillForTeam(card.teamId),
                } as React.CSSProperties
              }
              aria-label={potdSlotLabel(index, cards.length)}
            >
              <div className="pod-photo-stack">
                <PhotoFrame
                  src={card.photoSrc}
                  label={card.lastName || `player ${index + 1}`}
                  pan={card.pan}
                  custom={card.customPhoto}
                  empty={empty}
                  onPan={(pan) => onPan(index, pan)}
                  onUpload={(dataUrl) => onUpload(index, dataUrl)}
                  onUploadMany={(urls) =>
                    urls.forEach((url, offset) => onUpload(index + offset, url))
                  }
                  onPick={() => onPick(index)}
                />
                {card.playerId ? (
                  <input
                    className="pod-total"
                    value={`TOTAL: ${card.total}`}
                    maxLength={18}
                    aria-label={`${potdSlotLabel(index, cards.length)} total`}
                    onChange={(event) => {
                      const raw = event.target.value.replace(/^total:\s*/i, "");
                      onTotalChange(index, raw.slice(0, 8));
                    }}
                  />
                ) : null}
              </div>
              <div className="pod-stats">
                {team ? (
                  <div className="pod-stats__logo">
                    <TeamLogo src={team.logoSrc} label={team.name} fitX={0.92} fitY={0.92} />
                  </div>
                ) : null}
                <div className="pod-stats__grid">
                  {POTD_STAT_FIELDS.map((field) => (
                    <label key={field.key} className="pod-stat">
                      <input
                        value={card.stats[field.key] ?? ""}
                        maxLength={8}
                        aria-label={`${field.label} ${index === 0 ? "left" : "right"}`}
                        onChange={(event) =>
                          onStatsChange(index, {
                            ...card.stats,
                            [field.key]: event.target.value.slice(0, 8),
                          })
                        }
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pod-result">
                {wlColor && potdResultOutcome(card.result) ? (
                  <span
                    className={
                      potdResultOutcome(card.result) === "W"
                        ? "pod-wl-chip is-win"
                        : "pod-wl-chip is-loss"
                    }
                    aria-hidden="true"
                  >
                    {potdResultOutcome(card.result)}
                  </span>
                ) : null}
                <input
                  className="pod-result__line"
                  value={potdResultLineDisplay(card.result, wlColor)}
                  maxLength={32}
                  placeholder="SCORE W/L VS OPP"
                  aria-label={`${potdSlotLabel(index, cards.length)} result`}
                  onChange={(event) =>
                    onResultChange(
                      index,
                      potdResultFromDisplay(
                        event.target.value.slice(0, 32),
                        card.result,
                      ),
                    )
                  }
                />
              </div>
              <button
                type="button"
                className="pod-name"
                onClick={() => onPick(index)}
              >
                {team ? (
                  <div className="pod-name__logo">
                    <TeamLogo src={team.logoSrc} label="" cover />
                  </div>
                ) : null}
                {card.lastName || card.firstName ? (
                  <>
                    {lines.given ? (
                      <p className="pod-name__line">{lines.given}</p>
                    ) : null}
                    <p className="pod-name__line">{lines.family}</p>
                  </>
                ) : (
                  <span className="pod-name__empty" />
                )}
              </button>
            </section>
          );
        })}
      </div>
    </article>
  );
});
