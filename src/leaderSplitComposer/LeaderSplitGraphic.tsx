import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerNameLines,
  formatComposerName,
  useComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { teamLogoSrc } from "../everyTeamComposer/historicalRosters";
import { leaderRowName, type LeaderRow } from "../leaderboardComposer/leaderboardFill";
import {
  leaderPlateAccent,
  leaderPlateFill,
} from "../leaderboardComposer/leaderPlate";
import { leaderSplitLayout } from "./leaderSplitLayout";
import {
  leaderSplitVisibleEntries,
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
    const entries = leaderSplitVisibleEntries(draft, square);
    const first = entries[0]?.row;
    const lines = first
      ? composerNameLines(first.firstName, first.lastName, nameStyle)
      : { given: "", family: "" };
    const boardH = story ? STORY_DESIGN_HEIGHT : square ? GRAPHIC_WIDTH : GRAPHIC_HEIGHT;
    const layout = leaderSplitLayout(entries.length, draft.mirror, boardH);

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
          {entries.map((entry, index) => {
            const row = entry.row;
            const logo = row.teamId
              ? getTeam(row.teamId)?.logoSrc ?? teamLogoSrc(row.teamId, draft.season)
              : null;
            return (
              <li
                key={`ls-row-${entry.index}`}
                className={[
                  "ls-row",
                  draft.namePlates === true ? "is-plate" : "",
                  index === 0
                    ? "is-gold"
                    : index === 1
                      ? "is-silver"
                      : index === 2
                        ? "is-bronze"
                        : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  draft.namePlates === true
                    ? ({
                        ["--team-fill" as string]: leaderPlateFill(row.teamId),
                        ["--team-accent" as string]: leaderPlateAccent(row.teamId),
                      } as CSSProperties)
                    : undefined
                }
                onClick={() => onPickRow?.(entry.index)}
              >
                {draft.namePlates === true && logo ? (
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
                  value={
                    (nameStyle === "full"
                      ? row.lastName || row.firstName
                      : formatComposerName(
                          row.firstName,
                          row.lastName,
                          nameStyle,
                        )) || leaderRowName(row)
                  }
                  aria-label={`Leader ${index + 1} name`}
                  spellCheck={false}
                  onChange={(event) => {
                    const bits = event.target.value.split(/\s+/);
                    onRowChange(entry.index, {
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
                    onRowChange(entry.index, { value: event.target.value })
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
          label={lines.family || "leader photo"}
          pan={draft.pan}
          custom={draft.customPhoto}
          empty={!draft.photoSrc}
          vignette
          pickLabel="Pick player"
          onPan={onPan}
          onUpload={onUpload}
          onPick={onPick}
        />
        <div className="ls-fade" aria-hidden="true" />
        <div className="ls-photo-type">
          <input
            className="ls-kicker"
            value={draft.title}
            aria-label="Leader split title"
            spellCheck={false}
            onChange={(event) => onTitleChange(event.target.value)}
          />
          {lines.given ? <p className="ls-hero-given">{lines.given}</p> : null}
          {lines.family ? <p className="ls-hero-name">{lines.family}</p> : null}
          {first?.value ? <p className="ls-hero-value">{first.value}</p> : null}
        </div>
      </div>
    );

    return (
      <article
        ref={setRefs}
        className={[
          "ls-board",
          draft.namePlates === true ? "is-plates" : "",
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
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--ls-row-h" as string]: String(layout.rowH || 180),
          } as CSSProperties
        }
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
