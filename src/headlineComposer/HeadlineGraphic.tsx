import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import {
  chevronClipPolygon,
  headlinePanelHex,
  headlineSplitLayout,
  parseHeadlineSubjectMode,
  type HeadlineSubjectMode,
} from "./headlineLayout";
import {
  HEADLINE_BODY_MAX,
  HEADLINE_MAX,
  headlineLabel,
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
  subjectMode?: HeadlineSubjectMode;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  showBa?: boolean;
  exporting?: boolean;
  story?: boolean;
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
      subjectMode = "player",
      look = "white",
      purpleFlair = false,
      photoGrade = false,
      showBa = true,
      exporting = false,
      story = false,
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
    const subject = parseHeadlineSubjectMode(subjectMode);
    const boardH = story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
    const layout = headlineSplitLayout({
      headline,
      body,
      firstName,
      lastName,
      city: marks.city,
      nick: marks.nick,
      boardH,
      showBa,
    });
    const panelFill = headlinePanelHex(teamId);
    const kickerRows = Math.max(1, layout.kicker.lines.length);
    const bodyRows = Math.max(2, layout.body.lines.length);

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
          composerGradeClass(photoGrade),
          story ? "is-story" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--panel-fill" as string]: panelFill,
            ["--split-x" as string]: String(layout.splitX),
            ["--chev-x" as string]: String(layout.chevron.x),
            ["--chev-y" as string]: String(layout.chevron.y),
            ["--chev-w" as string]: String(layout.chevron.w),
            ["--chev-h" as string]: String(layout.chevron.h),
            ["--chev-clip" as string]: chevronClipPolygon(
              layout.chevron.rise,
              layout.chevron.w,
            ),
            ["--logo-x" as string]: String(layout.logo.x),
            ["--logo-y" as string]: String(layout.logo.y),
            ["--logo-size" as string]: String(layout.logo.size),
            ["--kicker-size" as string]: String(layout.kicker.size),
            ["--type-x" as string]: String(layout.given.x),
            ["--type-w" as string]: String(layout.given.w),
            ["--given-y" as string]: String(layout.given.y),
            ["--given-h" as string]: String(layout.given.h),
            ["--given-size" as string]: String(layout.given.size),
            ["--family-y" as string]: String(layout.family.y),
            ["--family-h" as string]: String(layout.family.h),
            ["--family-size" as string]: String(layout.family.size),
            ["--body-y" as string]: String(layout.body.y),
            ["--body-h" as string]: String(layout.body.h),
          } as React.CSSProperties
        }
        aria-label="Instagram headline graphic"
      >
        <div className="hl-photo" data-hl-box="photo">
          <PhotoFrame
            src={photoSrc}
            label={headlineLabel(headline) || "headline photo"}
            pan={pan}
            custom={customPhoto}
            empty={!photoSrc}
            vignette
            pickLabel=""
            changeLabel={subject === "team" ? "Change team" : "Change player"}
            onPan={onPan}
            onUpload={onUpload}
            onPick={onPick}
          />
        </div>
        <div className="hl-panel" data-hl-box="panel" aria-hidden={!team}>
          {team ? (
            <div className="hl-logo" data-hl-box="logo">
              <TeamLogo
                src={team.logoSrc}
                label={team.name}
                shadow={22}
                fitX={0.98}
                fitY={0.98}
              />
            </div>
          ) : null}
        </div>
        {showBa ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
            data-hl-box="ba"
          />
        ) : null}
        <div className="hl-chevron" data-hl-box="kicker">
          <div className="hl-chevron__plate">
            <textarea
              className="hl-kicker"
              value={headline}
              rows={kickerRows}
              maxLength={HEADLINE_MAX}
              spellCheck={false}
              aria-label="Headline kicker"
              onChange={(event) =>
                onComposerTextChange(event, onHeadlineChange, HEADLINE_MAX)
              }
            />
          </div>
        </div>
        {layout.given.text ? (
          <p className="hl-given" data-hl-box="given">
            {layout.given.text}
          </p>
        ) : null}
        {layout.family.text ? (
          <p className="hl-family" data-hl-box="family">
            {layout.family.text}
          </p>
        ) : null}
        <textarea
          className="hl-body"
          value={body}
          rows={bodyRows}
          maxLength={HEADLINE_BODY_MAX}
          spellCheck={false}
          aria-label="Headline body"
          placeholder="WILL NOT PLAY TONIGHT"
          data-hl-box="body"
          onChange={(event) =>
            onBodyChange(event.target.value.slice(0, HEADLINE_BODY_MAX))
          }
        />
        <div className="hl-frame" aria-hidden="true" />
      </article>
    );
  },
);
