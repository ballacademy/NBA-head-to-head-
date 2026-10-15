import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerWatermarkOpacity,
  parseComposerWatermark,
} from "../instagramComposer/composerWatermark";
import { getTeamColors } from "../lib/teamColors";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import { inkOnHex, statCardType } from "./statCardLayout";
import {
  clipStatLabel,
  clipStatValue,
  playerName,
  STC_LABEL_MAX,
  STC_NAME_MAX,
  STC_VALUE_MAX,
  type StatCardDraft,
} from "./statCardState";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";

interface StatCardGraphicProps {
  draft: StatCardDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  exporting?: boolean;
  onNameChange: (value: string) => void;
  onStatValue: (index: number, value: string) => void;
  onStatLabel: (index: number, value: string) => void;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
  onRemoveStat?: (index: number) => void;
}

export const StatCardGraphic = forwardRef<HTMLElement, StatCardGraphicProps>(
  function StatCardGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      exporting = false,
      onNameChange,
      onStatValue,
      onStatLabel,
      onPan,
      onUpload,
      onPick,
      onRemoveStat,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(1);
    const team = getTeam(draft.teamId);
    const colors = getTeamColors(draft.teamId ?? "");
    const nameInk = inkOnHex(colors.primary);
    const type = statCardType(draft.stats.length);
    const watermark = parseComposerWatermark(draft.watermark);

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
          "stc-board",
          exporting ? "is-exporting" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
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
          } as React.CSSProperties
        }
        aria-label="Instagram stat card"
      >
        <div className="stc-photo">
          <PhotoFrame
            src={draft.photoSrc}
            label={playerName(draft) || "stat card photo"}
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
              style={{ opacity: composerWatermarkOpacity(watermark) }}
            >
              <TeamLogo src={team.logoSrc} label={team.name} shadow={0} />
            </div>
          ) : null}
          {draft.stats.map((line, index) => (
            <div key={`${line.key}-${index}`} className="stc-row">
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
        </div>
        <div className="stc-name-bar">
          <input
            className="stc-name"
            value={playerName(draft)}
            maxLength={STC_NAME_MAX}
            placeholder="PLAYER"
            aria-label="Player name"
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
