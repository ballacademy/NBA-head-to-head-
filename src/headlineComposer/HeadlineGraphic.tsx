import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeamColors } from "../lib/teamColors";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import {
  HL_TORN_CLIP,
  headlineTypeStack,
  headlineWatermarkBox,
  parseHeadlineWatermark,
  type HeadlineWatermark,
} from "./headlineLayout";
import {
  HEADLINE_BODY_MAX,
  headlineBodyLines,
  headlineLabel,
  splitTeamWordmark,
} from "./headlineState";

interface HeadlineGraphicProps {
  headline: string;
  body: string;
  teamId: string | null;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  watermark?: HeadlineWatermark;
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
  exporting?: boolean;
  onHeadlineChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
}

export const HeadlineGraphic = forwardRef<HTMLElement, HeadlineGraphicProps>(
  function HeadlineGraphic(
    {
      headline,
      body,
      teamId,
      photoSrc,
      customPhoto,
      pan,
      watermark = "behind",
      look = "white",
      purpleFlair = false,
      showBa = true,
      exporting = false,
      onHeadlineChange,
      onBodyChange,
      onPan,
      onUpload,
      onPick,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const team = getTeam(teamId);
    const marks = splitTeamWordmark(team);
    const mode = parseHeadlineWatermark(watermark);
    const lines = headlineBodyLines(body);
    const stack = headlineTypeStack(lines.length, Boolean(team));
    const markBox = headlineWatermarkBox(mode, stack);
    const teamColor = teamId ? getTeamColors(teamId).primary : "transparent";

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
          "hl-board",
          exporting ? "is-exporting" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--team-color" as string]: teamColor,
            ["--torn-clip" as string]: `polygon(${HL_TORN_CLIP})`,
          } as React.CSSProperties
        }
        aria-label="Instagram headline graphic"
      >
        <PhotoFrame
          src={photoSrc}
          label={headlineLabel(headline) || "headline photo"}
          pan={pan}
          custom={customPhoto}
          empty={!photoSrc}
          vignette
          onPan={onPan}
          onUpload={onUpload}
          onPick={onPick}
        />
        <div className="hl-fade" aria-hidden="true" />
        {team && mode !== "off" ? (
          <div
            className={mode === "small" ? "hl-mark is-small" : "hl-mark is-behind"}
            style={
              mode === "behind"
                ? { top: `calc(${markBox.y} * var(--u))` }
                : undefined
            }
            aria-hidden="true"
          >
            <TeamLogo src={team.logoSrc} label={team.name} shadow={0} />
          </div>
        ) : null}
        {showBa ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        <div className="hl-type">
          {marks.city ? (
            <p className="hl-wordmark-city" aria-hidden="true">
              {marks.city}
            </p>
          ) : null}
          <div className="hl-headline-plate">
            {team ? <span className="hl-plate-accent" aria-hidden="true" /> : null}
            <input
              className="hl-headline"
              value={headline}
              maxLength={32}
              spellCheck={false}
              aria-label="Headline"
              onChange={(event) =>
                onComposerTextChange(event, onHeadlineChange, 32)
              }
            />
          </div>
          {marks.nick ? (
            <p className="hl-wordmark-nick" aria-hidden="true">
              {marks.nick}
            </p>
          ) : null}
          <textarea
            className="hl-body"
            value={body}
            rows={3}
            maxLength={HEADLINE_BODY_MAX}
            spellCheck={false}
            aria-label="Headline body"
            placeholder="BEATS OKC 111-109"
            onChange={(event) =>
              onBodyChange(event.target.value.slice(0, HEADLINE_BODY_MAX))
            }
          />
        </div>
      </article>
    );
  },
);
