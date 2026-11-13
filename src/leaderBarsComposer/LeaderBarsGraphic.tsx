import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import { formatComposerName, useComposerNameStyle } from "../instagramComposer/composerNameStyle";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { PlayerNameFade } from "../instagramComposer/PlayerNameFade";
import { getTeamColors } from "../lib/teamColors";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { teamLogoSrc } from "../everyTeamComposer/historicalRosters";
import {
  barWidthPct,
  leaderRowName,
  leaderRowOccupied,
  maxLeaderRaw,
  type LeaderRow,
} from "../leaderboardComposer/leaderboardFill";
import {
  leaderPlateAccent,
  leaderPlateFill,
} from "../leaderboardComposer/leaderPlate";
import { leaderBarsLayout } from "./leaderBarsLayout";
import {
  leaderBarsExportRows,
  splitLeaderBarsTitle,
  type LeaderBarsDraft,
} from "./leaderBarsState";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";

interface LeaderBarsGraphicProps {
  draft: LeaderBarsDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  story?: boolean;
  square?: boolean;
  onTitleChange: (value: string) => void;
  onRowChange: (index: number, patch: Partial<LeaderRow>) => void;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
}

const u = (value: number) => `calc(${value} * var(--u))`;

const boxStyle = (rect: { x: number; y: number; w: number; h: number }) =>
  ({
    left: u(rect.x),
    top: u(rect.y),
    width: u(rect.w),
    height: u(rect.h),
  }) as const;

export const LeaderBarsGraphic = forwardRef<HTMLElement, LeaderBarsGraphicProps>(
  function LeaderBarsGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      photoGrade = false,
      exporting = false,
      story = false,
      square = false,
      onTitleChange,
      onRowChange,
      onPan,
      onUpload,
      onPick,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(1);
    const [nameStyle] = useComposerNameStyle();
    const rows = leaderBarsExportRows(draft, exporting, square);
    const max = maxLeaderRaw(rows);
    const lines = splitLeaderBarsTitle(draft.title);
    const empty = !draft.photoSrc && !rows.some(leaderRowOccupied);
    const photoOnTop = draft.photoPos !== "bottom";
    const boardH = story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
    const layout = leaderBarsLayout(rows.length, photoOnTop, boardH);
    const hero = rows[0];
    const heroNamed = Boolean(hero && leaderRowName(hero));
    const plates = draft.namePlates === true;

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

    const stackTop = layout.title.y;
    const stackH = boardH - stackTop;

    return (
      <article
        ref={setRefs}
        className={[
          "lb-board",
          empty ? "is-empty" : "",
          plates ? "is-plates" : "",
          photoOnTop ? "" : "is-bottom",
          story ? "is-story" : "",
          square ? "is-square" : "",
          exporting ? "is-exporting" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
          composerGradeClass(photoGrade),
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ["--u" as string]: `${unit}px` } as React.CSSProperties}
        aria-label="Instagram leader bars graphic"
      >
        <div className="lb-hero" style={boxStyle(layout.photo)}>
          <PhotoFrame
            src={draft.photoSrc}
            label={
              leaderRowName(
                hero ?? {
                  firstName: "",
                  lastName: "",
                  playerId: null,
                  teamId: null,
                  value: "",
                  rawValue: null,
                  headshotUrl: null,
                },
              ) || "leader photo"
            }
            pan={draft.pan}
            custom={draft.customPhoto}
            empty={!draft.photoSrc}
            vignette
            pickLabel="Pick player"
            onPan={onPan}
            onUpload={onUpload}
            onPick={onPick}
          />
          {heroNamed ? (
            <PlayerNameFade
              firstName={hero!.firstName}
              lastName={hero!.lastName}
              teamId={hero!.teamId}
              empty={false}
              givenAria="Leader first name"
              familyAria="Leader last name"
              stat={hero!.value}
              onFirstChange={(firstName) => onRowChange(0, { firstName })}
              onLastChange={(lastName) => onRowChange(0, { lastName })}
              onEmptyClick={onPick}
            />
          ) : null}
        </div>
        {draft.showBa !== false ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        <div
          className="lb-stack"
          style={{
            top: u(stackTop),
            height: u(stackH),
          }}
        >
          <div className="lb-title-box">
            <ComposerTitleField
              value={draft.title}
              lines={lines}
              ariaLabel="Leader bars title"
              inputClassName="lb-title-input"
              lineClassName="lb-title-line"
              onChange={onTitleChange}
            />
          </div>
          <ol className="lb-bars">
            {rows.map((row, index) => {
              const gold = draft.barStyle === "gold" && index === 0 && leaderRowName(row);
              const teamColor = row.teamId ? getTeamColors(row.teamId).primary : "#f4f4f4";
              const logo = row.teamId
                ? getTeam(row.teamId)?.logoSrc ?? teamLogoSrc(row.teamId, draft.season)
                : null;
              return (
                <li
                  key={`lb-row-${index}`}
                  className={[
                    "lb-row",
                    gold ? "is-gold" : "",
                    plates ? "is-plate" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    {
                      ["--team-bar" as string]: teamColor,
                      ["--team-fill" as string]: leaderPlateFill(row.teamId),
                      ["--team-accent" as string]: leaderPlateAccent(row.teamId),
                    } as React.CSSProperties
                  }
                >
                  {plates && logo ? (
                    <img className="lb-row__mark" src={logo} alt="" />
                  ) : null}
                  <span className="lb-rank">{index + 1}</span>
                  {draft.showBarHeadshots && row.headshotUrl ? (
                    <img className="lb-face" src={row.headshotUrl} alt="" />
                  ) : logo ? (
                    <img className="lb-logo" src={logo} alt="" />
                  ) : (
                    <span className="lb-logo" />
                  )}
                  <input
                    className="lb-name"
                    value={
                      formatComposerName(row.firstName, row.lastName, nameStyle) ||
                      leaderRowName(row)
                    }
                    aria-label={`Leader ${index + 1} name`}
                    spellCheck={false}
                    onChange={(event) => {
                      const bits = event.target.value.split(/\s+/);
                      onRowChange(index, {
                        firstName: bits.slice(0, -1).join(" "),
                        lastName: bits.at(-1) ?? "",
                      });
                    }}
                  />
                  <div className="lb-track" aria-hidden="true">
                    <div
                      className={[
                        "lb-fill",
                        gold ? "" : "is-team",
                        draft.barStyle === "team" ? "is-team" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ width: `${barWidthPct(row, max)}%` }}
                    />
                  </div>
                  <input
                    className="lb-value"
                    value={row.value}
                    aria-label={`Leader ${index + 1} value`}
                    spellCheck={false}
                    onChange={(event) =>
                      onRowChange(index, { value: event.target.value })
                    }
                  />
                </li>
              );
            })}
          </ol>
        </div>
      </article>
    );
  },
);
