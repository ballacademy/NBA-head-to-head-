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
  parseHeadlineBoardMode,
  parseHeadlineNameStack,
  parseHeadlinePanelLeft,
  type HeadlineBoardMode,
  type HeadlineNameStack,
} from "./headlineLayout";
import {
  HEADLINE_BODY_MAX,
  HEADLINE_MAX,
  HEADLINE_META_MAX,
  HEADLINE_NAME_MAX,
  HEADLINE_SOURCE_MAX,
  HEADLINE_STORY_MAX,
  headlineLabel,
  teamShortLockup,
  splitTeamWordmark,
} from "./headlineState";

interface HeadlineGraphicProps {
  headline: string;
  body: string;
  teamId: string | null;
  secondTeamId?: string | null;
  firstName?: string;
  lastName?: string;
  photoSrc: string | null;
  customPhoto: boolean;
  pan: PhotoPan;
  boardMode?: HeadlineBoardMode;
  panelLeft?: boolean;
  nameStack?: HeadlineNameStack;
  storyLine?: string;
  showMeta?: boolean;
  metaLine?: string;
  sourceCredit?: string;
  photoBw?: boolean;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  showBa?: boolean;
  exporting?: boolean;
  story?: boolean;
  onHeadlineChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onStoryChange?: (value: string) => void;
  onMetaChange?: (value: string) => void;
  onSourceChange?: (value: string) => void;
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
      secondTeamId = null,
      firstName = "",
      lastName = "",
      photoSrc,
      customPhoto,
      pan,
      boardMode = "split",
      panelLeft = false,
      nameStack = "hurts",
      storyLine = "",
      showMeta = false,
      metaLine = "",
      sourceCredit = "",
      photoBw = false,
      look = "white",
      purpleFlair = false,
      photoGrade = false,
      showBa = true,
      exporting = false,
      story = false,
      onHeadlineChange,
      onBodyChange,
      onFirstNameChange,
      onLastNameChange,
      onStoryChange,
      onMetaChange,
      onSourceChange,
      onPan,
      onUpload,
      onPick,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const team = getTeam(teamId);
    const teamB = getTeam(secondTeamId);
    const marks = splitTeamWordmark(team);
    const mode = parseHeadlineBoardMode(boardMode);
    const boardH = story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
    const layout = headlineSplitLayout({
      headline,
      body,
      firstName,
      lastName,
      city: marks.city,
      nick: marks.nick,
      shortName: teamShortLockup(team),
      boardH,
      showBa,
      panelLeft: parseHeadlinePanelLeft(panelLeft),
      boardMode: mode,
      nameStack: parseHeadlineNameStack(nameStack),
      storyLine,
      metaLine,
      sourceCredit,
    });
    const panelFill = headlinePanelHex(teamId);
    const panelFillB = headlinePanelHex(secondTeamId);
    const kickerRows = Math.max(1, layout.kicker.lines.length);
    const bodyRows = Math.max(2, layout.body.lines.length);
    const teamOnly = mode === "team-only";

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
          photoBw ? "is-bw" : "",
          layout.panelLeft ? "is-mirror" : "",
          teamOnly ? "is-team-only" : "",
          mode === "trade" ? "is-trade" : "",
          story ? "is-story" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--panel-fill" as string]: panelFill,
            ["--panel-fill-b" as string]: panelFillB,
            ["--photo-x" as string]: String(layout.photo.x),
            ["--photo-w" as string]: String(layout.photo.w),
            ["--panel-x" as string]: String(layout.panel.x),
            ["--panel-w" as string]: String(layout.panel.w),
            ["--panel-b-x" as string]: String(layout.panelB.x),
            ["--panel-b-w" as string]: String(layout.panelB.w),
            ["--split-x" as string]: String(layout.splitX),
            ["--chev-x" as string]: String(layout.chevron.x),
            ["--chev-y" as string]: String(layout.chevron.y),
            ["--chev-w" as string]: String(layout.chevron.w),
            ["--chev-h" as string]: String(layout.chevron.h),
            ["--chev-clip" as string]: chevronClipPolygon(
              layout.chevron.rise,
              layout.chevron.w,
              layout.chevron.mirror,
            ),
            ["--logo-x" as string]: String(layout.logo.x),
            ["--logo-y" as string]: String(layout.logo.y),
            ["--logo-size" as string]: String(layout.logo.size),
            ["--logo-b-x" as string]: String(layout.logoB.x),
            ["--kicker-size" as string]: String(layout.kicker.size),
            ["--kicker-rows" as string]: String(kickerRows),
            ["--type-x" as string]: String(layout.given.x),
            ["--type-w" as string]: String(layout.given.w),
            ["--story-y" as string]: String(layout.story.y),
            ["--story-h" as string]: String(layout.story.h),
            ["--story-size" as string]: String(layout.story.size),
            ["--given-y" as string]: String(layout.given.y),
            ["--given-h" as string]: String(layout.given.h),
            ["--given-size" as string]: String(layout.given.size),
            ["--given-rows" as string]: String(
              Math.max(1, layout.given.lines.length),
            ),
            ["--family-y" as string]: String(layout.family.y),
            ["--family-h" as string]: String(layout.family.h),
            ["--family-size" as string]: String(layout.family.size),
            ["--family-rows" as string]: String(
              Math.max(1, layout.family.lines.length),
            ),
            ["--meta-y" as string]: String(layout.meta.y),
            ["--meta-h" as string]: String(layout.meta.h),
            ["--meta-size" as string]: String(layout.meta.size),
            ["--body-y" as string]: String(layout.body.y),
            ["--body-h" as string]: String(layout.body.h),
            ["--source-y" as string]: String(layout.source.y),
            ["--ba-x" as string]: String(layout.ba.x),
          } as React.CSSProperties
        }
        aria-label="Instagram headline graphic"
      >
        {layout.photo.w > 0 ? (
          <div className="hl-photo" data-hl-box="photo">
            <PhotoFrame
              src={photoSrc}
              label={headlineLabel(headline) || "headline photo"}
              pan={pan}
              custom={customPhoto}
              empty={!photoSrc}
              vignette
              pickLabel="Pick player"
              changeLabel="Change player"
              onPan={onPan}
              onUpload={onUpload}
              onPick={onPick}
            />
          </div>
        ) : null}
        <div className="hl-panel" data-hl-box="panel">
          {team ? (
            <div className="hl-logo" data-hl-box="logo">
              <TeamLogo
                src={team.logoSrc}
                label={team.name}
                shadow={22}
                fitX={0.94}
                fitY={0.9}
              />
            </div>
          ) : null}
        </div>
        {layout.panelB.w > 0 ? (
          <div className="hl-panel hl-panel--b" data-hl-box="panel-b">
            {teamB ? (
              <div className="hl-logo hl-logo--b" data-hl-box="logo-b">
                <TeamLogo
                  src={teamB.logoSrc}
                  label={teamB.name}
                  shadow={22}
                  fitX={0.94}
                  fitY={0.9}
                />
              </div>
            ) : null}
          </div>
        ) : null}
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
        {storyLine ? (
          <textarea
            className="hl-story"
            value={storyLine}
            rows={1}
            maxLength={HEADLINE_STORY_MAX}
            spellCheck={false}
            aria-label="Headline story line"
            placeholder=""
            data-hl-box="story"
            onChange={(event) =>
              onStoryChange?.(event.target.value.slice(0, HEADLINE_STORY_MAX))
            }
          />
        ) : null}
        <textarea
          className="hl-given"
          value={firstName}
          rows={Math.max(1, layout.given.lines.length)}
          maxLength={HEADLINE_NAME_MAX}
          spellCheck={false}
          aria-label="Stacked name line 1"
          placeholder={layout.given.text || "First name"}
          data-hl-box="given"
          onChange={(event) =>
            onComposerTextChange(event, onFirstNameChange, HEADLINE_NAME_MAX)
          }
        />
        <textarea
          className="hl-family"
          value={lastName}
          rows={Math.max(1, layout.family.lines.length)}
          maxLength={HEADLINE_NAME_MAX}
          spellCheck={false}
          aria-label="Stacked name line 2"
          placeholder={layout.family.text || "Last name"}
          data-hl-box="family"
          onChange={(event) =>
            onComposerTextChange(event, onLastNameChange, HEADLINE_NAME_MAX)
          }
        />
        {showMeta || metaLine ? (
          <textarea
            className="hl-meta"
            value={metaLine}
            rows={1}
            maxLength={HEADLINE_META_MAX}
            spellCheck={false}
            aria-label="Headline record line"
            placeholder="1–0 · OCT 16"
            data-hl-box="meta"
            onChange={(event) =>
              onMetaChange?.(event.target.value.slice(0, HEADLINE_META_MAX))
            }
          />
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
        {sourceCredit ? (
          <textarea
            className="hl-source"
            value={sourceCredit}
            rows={1}
            maxLength={HEADLINE_SOURCE_MAX}
            spellCheck={false}
            aria-label="Headline source credit"
            placeholder=""
            data-hl-box="source"
            onChange={(event) =>
              onSourceChange?.(event.target.value.slice(0, HEADLINE_SOURCE_MAX))
            }
          />
        ) : null}
        <div className="hl-frame" aria-hidden="true" />
      </article>
    );
  },
);
