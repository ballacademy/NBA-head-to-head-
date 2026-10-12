import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { PhotoFrame } from "./PhotoFrame";
import { statsFillForTeam } from "./playerOfTheDayLayout";
import {
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

const STAT_FIELDS: Array<{ key: keyof LastGameStats; label: string }> = [
  { key: "pts", label: "PTS" },
  { key: "blk", label: "BLK" },
  { key: "reb", label: "REB" },
  { key: "fg", label: "FG" },
  { key: "ast", label: "AST" },
  { key: "three", label: "3P" },
  { key: "stl", label: "STL" },
  { key: "tov", label: "TOV" },
];

export const PlayerOfTheDayGraphic = forwardRef<
  HTMLElement,
  PlayerOfTheDayGraphicProps
>(function PlayerOfTheDayGraphic(
  {
    brand,
    title,
    date,
    cards,
    look = "classic",
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
      className={["pod-board", exporting ? "is-exporting" : "", composerLookClass(look)]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--u" as string]: `${unit}px` } as React.CSSProperties}
      aria-label="Instagram player of the day graphic"
    >
      <header className="pod-header">
        <input
          className="pod-brand"
          value={brand}
          maxLength={24}
          spellCheck={false}
          aria-label="Brand label"
          onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
        />
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
          const empty = !card.playerId;
          return (
            <section
              key={`pod-card-${index}`}
              className="pod-card"
              style={
                {
                  ["--team-fill" as string]: statsFillForTeam(card.teamId),
                } as React.CSSProperties
              }
              aria-label={index === 0 ? "Left player" : "Right player"}
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
                  onPick={() => onPick(index)}
                />
                <input
                  className="pod-total"
                  value={`TOTAL: ${card.total}`}
                  maxLength={18}
                  aria-label={index === 0 ? "Left total" : "Right total"}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/^total:\s*/i, "");
                    onTotalChange(index, raw.slice(0, 8));
                  }}
                />
              </div>
              <div className="pod-stats">
                {team ? (
                  <div className="pod-stats__logo">
                    <TeamLogo src={team.logoSrc} label={team.name} fitX={0.92} fitY={0.92} />
                  </div>
                ) : null}
                <div className="pod-stats__grid">
                  {STAT_FIELDS.map((field) => (
                    <label key={field.key} className="pod-stat">
                      <input
                        value={card.stats[field.key]}
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
              <input
                className="pod-result"
                value={card.result}
                maxLength={32}
                placeholder="SCORE W/L VS OPP"
                aria-label={index === 0 ? "Left result" : "Right result"}
                onChange={(event) =>
                  onResultChange(index, event.target.value.slice(0, 32))
                }
              />
              <button
                type="button"
                className="pod-name"
                onClick={() => onPick(index)}
              >
                {team ? (
                  <div className="pod-name__logo">
                    <TeamLogo src={team.logoSrc} label="" fill />
                  </div>
                ) : null}
                {card.lastName || card.firstName ? (
                  <>
                    <p className="pod-name__line">{card.firstName}</p>
                    <p className="pod-name__line">{card.lastName}</p>
                  </>
                ) : (
                  <span className="pod-name__empty">Pick player</span>
                )}
              </button>
            </section>
          );
        })}
      </div>
    </article>
  );
});
