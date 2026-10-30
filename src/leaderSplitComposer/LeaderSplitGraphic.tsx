import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { formatComposerName, useComposerNameStyle } from "../instagramComposer/composerNameStyle";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { teamLogoSrc } from "../everyTeamComposer/historicalRosters";
import { leaderRowName, type LeaderRow } from "../leaderboardComposer/leaderboardFill";
import {
  leaderPlateAccent,
  leaderPlateFill,
} from "../leaderboardComposer/leaderPlate";
import {
  leaderSplitExportRows,
  type LeaderSplitDraft,
} from "./leaderSplitState";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";

interface LeaderSplitGraphicProps {
  draft: LeaderSplitDraft;
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
  onPickRow?: (index: number) => void;
}

export const LeaderSplitGraphic = forwardRef<HTMLElement, LeaderSplitGraphicProps>(
  function LeaderSplitGraphic(
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
      onPickRow,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(1);
    const [nameStyle] = useComposerNameStyle();
    const rows = leaderSplitExportRows(draft, exporting, square);
    const first = rows[0];
    const heroLast = first
      ? formatComposerName(first.firstName, first.lastName, "last")
      : "";

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

    const list = (
      <div className="ls-list">
        <ol className="ls-rows">
          {rows.map((row, index) => {
            const logo = row.teamId
              ? getTeam(row.teamId)?.logoSrc ?? teamLogoSrc(row.teamId, draft.season)
              : null;
            return (
              <li
                key={`ls-row-${index}`}
                className={["ls-row", draft.namePlates !== false ? "is-plate" : ""]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  draft.namePlates !== false
                    ? ({
                        ["--team-fill" as string]: leaderPlateFill(row.teamId),
                        ["--team-accent" as string]: leaderPlateAccent(row.teamId),
                      } as React.CSSProperties)
                    : undefined
                }
                onClick={() => onPickRow?.(index)}
              >
                {draft.namePlates !== false && logo ? (
                  <img className="ls-row__mark" src={logo} alt="" />
                ) : null}
                <span className="ls-rank">{index + 1}</span>
                {draft.showListHeadshots && row.headshotUrl ? (
                  <img className="ls-face" src={row.headshotUrl} alt="" />
                ) : logo ? (
                  <img className="ls-logo" src={logo} alt="" />
                ) : (
                  <span className="ls-logo" />
                )}
                <input
                  className="ls-name"
                  value={formatComposerName(row.firstName, row.lastName, nameStyle) || leaderRowName(row)}
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
                <input
                  className="ls-value"
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
    );

    const photo = (
      <div className="ls-photo-wrap">
        <PhotoFrame
          src={draft.photoSrc}
          label={heroLast || "leader photo"}
          pan={draft.pan}
          custom={draft.customPhoto}
          empty={!draft.photoSrc}
          vignette
          onPan={onPan}
          onUpload={onUpload}
          onPick={onPick}
        />
        <div className="ls-fade" aria-hidden="true" />
        <div className="ls-photo-type">
          <input
            className="ls-kicker"
            value={draft.title}
            aria-label="Gold kicker"
            spellCheck={false}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          {heroLast ? <p className="ls-hero-name">{heroLast}</p> : null}
          {first?.value ? <p className="ls-hero-value">{first.value}</p> : null}
        </div>
      </div>
    );

    return (
      <article
        ref={setRefs}
        className={[
          "ls-board",
          draft.namePlates !== false ? "is-plates" : "",
          draft.mirror ? "is-mirror" : "",
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
        aria-label="Instagram leader split graphic"
      >
        {list}
        {photo}
        {draft.showBa !== false ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
      </article>
    );
  },
);
