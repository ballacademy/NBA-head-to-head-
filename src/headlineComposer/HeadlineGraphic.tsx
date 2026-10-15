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
  fitHeadlineType,
  headlineDateKicker,
  headlinePlateHeight,
  headlineTypeStack,
  headlineWatermarkBox,
  parseHeadlineKickerMode,
  parseHeadlineLockup,
  parseHeadlineNamePlacement,
  parseHeadlinePlateColor,
  parseHeadlineSubjectMode,
  parseHeadlineWatermark,
  plateClipPolygon,
  plateFillHex,
  plateInkHex,
  type HeadlineKickerMode,
  type HeadlineLockup,
  type HeadlineNamePlacement,
  type HeadlinePlateColor,
  type HeadlineSubjectMode,
  type HeadlineWatermark,
} from "./headlineLayout";
import {
  HEADLINE_BODY_MAX,
  HEADLINE_MAX,
  headlineBodyLines,
  headlineLabel,
  headlinePlayerName,
  splitTeamWordmark,
} from "./headlineState";

interface HeadlineGraphicProps {
  headline: string;
  body: string;
  teamId: string | null;
  firstName?: string;
  lastName?: string;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  watermark?: HeadlineWatermark;
  plateColor?: HeadlinePlateColor;
  lockup?: HeadlineLockup;
  namePlacement?: HeadlineNamePlacement;
  showOpponentMark?: boolean;
  kickerMode?: HeadlineKickerMode;
  subjectMode?: HeadlineSubjectMode;
  opponentId?: string | null;
  gameDate?: string | null;
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
      firstName = "",
      lastName = "",
      photoSrc,
      customPhoto,
      pan,
      watermark = "faint",
      plateColor = "white",
      lockup = "bottom",
      namePlacement = "off",
      showOpponentMark = false,
      kickerMode = "off",
      subjectMode = "player",
      opponentId = null,
      gameDate = null,
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
    const opponent = getTeam(opponentId);
    const marks = splitTeamWordmark(team);
    const mode = parseHeadlineWatermark(watermark);
    const plate = parseHeadlinePlateColor(plateColor);
    const place = parseHeadlineLockup(lockup);
    const names = parseHeadlineNamePlacement(namePlacement);
    const kicker = parseHeadlineKickerMode(kickerMode);
    const subject = parseHeadlineSubjectMode(subjectMode);
    const bodyLines = headlineBodyLines(body);
    const fit = fitHeadlineType(headline);
    const kickerText = headlineDateKicker(gameDate, kicker);
    const playerName = headlinePlayerName({ firstName, lastName });
    const plateH = headlinePlateHeight(fit, names === "plate" && Boolean(playerName));
    const stack = headlineTypeStack({
      bodyLines: Math.max(bodyLines.length, 1),
      plateH,
      lockup: place,
      kicker: Boolean(kickerText),
      nameUnder: names === "under" && Boolean(playerName),
    });
    const markBox = headlineWatermarkBox(mode, stack);
    const teamColor = teamId ? getTeamColors(teamId).primary : "#ffffff";
    const fill = plateFillHex(plate, teamColor);
    const ink = plateInkHex(fill);

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
          stack.fadeAt === "top" ? "is-lockup-top" : "is-lockup-bottom",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--team-color" as string]: teamColor,
            ["--plate-fill" as string]: fill,
            ["--plate-ink" as string]: ink,
            ["--plate-clip" as string]: plateClipPolygon(),
            ["--hl-size" as string]: String(fit.size),
            ["--plate-top" as string]: String(stack.plateTop),
            ["--plate-h" as string]: String(plateH),
            ["--city-top" as string]: String(stack.cityTop),
            ["--nick-top" as string]: String(stack.nickTop),
            ["--kicker-top" as string]: String(stack.kickerTop),
            ["--name-top" as string]: String(stack.nameTop),
            ["--body-top" as string]: String(stack.bodyTop),
            ["--mark-top" as string]: String(markBox.y),
            ["--mark-opacity" as string]: String(markBox.opacity),
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
          pickLabel={subject === "team" ? "Pick team" : "Pick player"}
          changeLabel={subject === "team" ? "Change team" : "Change player"}
          onPan={onPan}
          onUpload={onUpload}
          onPick={onPick}
        />
        <div className="hl-fade" aria-hidden="true" />
        {team && mode !== "off" ? (
          <div className="hl-mark is-behind" aria-hidden="true">
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
        {kickerText ? <p className="hl-kicker">{kickerText}</p> : null}
        {marks.city ? (
          <p className="hl-wordmark-city" aria-hidden="true">
            {marks.city}
          </p>
        ) : null}
        <div className="hl-headline-plate">
          <textarea
            className="hl-headline"
            value={headline}
            rows={fit.lines.length}
            maxLength={HEADLINE_MAX}
            spellCheck={false}
            aria-label="Headline"
            onChange={(event) =>
              onComposerTextChange(event, onHeadlineChange, HEADLINE_MAX)
            }
          />
          {names === "plate" && playerName ? (
            <p className="hl-name is-plate">{playerName}</p>
          ) : null}
        </div>
        {marks.nick ? (
          <p className="hl-wordmark-nick" aria-hidden="true">
            {marks.nick}
          </p>
        ) : null}
        {names === "under" && playerName ? (
          <p className="hl-name is-under">{playerName}</p>
        ) : null}
        <div className="hl-body-wrap">
          {showOpponentMark && opponent ? (
            <div className="hl-opp" aria-hidden="true">
              <TeamLogo src={opponent.logoSrc} label={opponent.name} shadow={0} />
            </div>
          ) : null}
          <textarea
            className="hl-body"
            value={body}
            rows={3}
            maxLength={HEADLINE_BODY_MAX}
            spellCheck={false}
            aria-label="Headline body"
            placeholder="BEATS OKC 111–109"
            onChange={(event) =>
              onBodyChange(event.target.value.slice(0, HEADLINE_BODY_MAX))
            }
          />
        </div>
      </article>
    );
  },
);
