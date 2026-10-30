import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { useComposerNameStyle } from "../instagramComposer/composerNameStyle";
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
import { dualExportColumns, fitDualRankName, type DualRanksDraft } from "./dualRanksState";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";

interface DualRanksGraphicProps {
  draft: DualRanksDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  story?: boolean;
  square?: boolean;
  onHeaderChange: (side: "left" | "right", value: string) => void;
  onRowChange: (side: "left" | "right", index: number, patch: Partial<LeaderRow>) => void;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
}

const Column = ({
  header,
  rows,
  featuredId,
  season,
  aria,
  onHeader,
  onRow,
  nameStyle,
  namePlates,
}: {
  header: string;
  rows: LeaderRow[];
  featuredId: string | null;
  season: string;
  aria: string;
  onHeader: (value: string) => void;
  onRow: (index: number, patch: Partial<LeaderRow>) => void;
  nameStyle: "full" | "last" | "initial";
  namePlates: boolean;
}) => (
  <div className="dr-col">
    <input
      className="dr-head"
      value={header}
      aria-label={aria}
      spellCheck={false}
      onChange={(event) => onHeader(event.target.value)}
    />
    <ol className="dr-rows">
      {rows.map((row, index) => {
        const logo = row.teamId
          ? getTeam(row.teamId)?.logoSrc ?? teamLogoSrc(row.teamId, season)
          : null;
        const featured = Boolean(featuredId && row.playerId === featuredId);
        return (
          <li
            key={`${aria}-${index}`}
            className={[
              "dr-row",
              featured ? "is-feature" : "",
              namePlates ? "is-plate" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              namePlates
                ? ({
                    ["--team-fill" as string]: leaderPlateFill(row.teamId),
                    ["--team-accent" as string]: leaderPlateAccent(row.teamId),
                  } as React.CSSProperties)
                : undefined
            }
          >
            {namePlates && logo ? (
              <img className="dr-row__mark" src={logo} alt="" />
            ) : null}
            <span className="dr-rank">{index + 1}</span>
            {logo ? <img className="dr-logo" src={logo} alt="" /> : <span className="dr-logo" />}
            <input
              className="dr-name"
              value={fitDualRankName(row, nameStyle) || leaderRowName(row)}
              aria-label={`${aria} ${index + 1} name`}
              spellCheck={false}
              onChange={(event) => {
                const bits = event.target.value.split(/\s+/);
                onRow(index, {
                  firstName: bits.slice(0, -1).join(" "),
                  lastName: bits.at(-1) ?? "",
                });
              }}
            />
            <input
              className="dr-value"
              value={row.value}
              aria-label={`${aria} ${index + 1} value`}
              spellCheck={false}
              onChange={(event) => onRow(index, { value: event.target.value })}
            />
          </li>
        );
      })}
    </ol>
  </div>
);

export const DualRanksGraphic = forwardRef<HTMLElement, DualRanksGraphicProps>(
  function DualRanksGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      photoGrade = false,
      exporting = false,
      story = false,
      square = false,
      onHeaderChange,
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
    const cols = dualExportColumns(draft, exporting, square);

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

    const layoutClass =
      draft.layout === "top" ? "is-top" : draft.layout === "well" ? "is-well" : "";

    return (
      <article
        ref={setRefs}
        className={[
          "dr-board",
          draft.namePlates !== false ? "is-plates" : "",
          layoutClass,
          story ? "is-story" : "",
          square ? "is-square" : "",
          cols.hideRight ? "is-hide-right" : "",
          cols.hideLeft ? "is-hide-left" : "",
          exporting ? "is-exporting" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
          composerGradeClass(photoGrade),
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ["--u" as string]: `${unit}px` } as React.CSSProperties}
        aria-label="Instagram dual ranks graphic"
      >
        <div className="dr-photo-wrap">
          <PhotoFrame
            src={draft.photoSrc}
            label="featured player"
            pan={draft.pan}
            custom={draft.customPhoto}
            empty={!draft.photoSrc}
            vignette
            onPan={onPan}
            onUpload={onUpload}
            onPick={onPick}
          />
        </div>
        <div className="dr-cols">
          {cols.hideLeft ? null : (
            <Column
              header={draft.leftHeader}
              rows={cols.left}
              featuredId={draft.featuredPlayerId}
              season={draft.season}
              aria="Left board"
              onHeader={(value) => onHeaderChange("left", value)}
              onRow={(index, patch) => onRowChange("left", index, patch)}
              nameStyle={nameStyle}
              namePlates={draft.namePlates !== false}
            />
          )}
          {cols.hideRight ? null : (
            <Column
              header={draft.rightHeader}
              rows={cols.right}
              featuredId={draft.featuredPlayerId}
              season={draft.season}
              aria="Right board"
              onHeader={(value) => onHeaderChange("right", value)}
              onRow={(index, patch) => onRowChange("right", index, patch)}
              nameStyle={nameStyle}
              namePlates={draft.namePlates !== false}
            />
          )}
        </div>
        {draft.showBa !== false ? (
          <img className="composer-ba" src="/ba-logo-circled.png" alt="" aria-hidden="true" />
        ) : null}
      </article>
    );
  },
);
