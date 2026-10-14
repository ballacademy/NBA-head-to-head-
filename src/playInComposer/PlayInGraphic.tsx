import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import {
  PI_BYE_LABEL,
  PI_KICKER,
  PI_LEGEND,
  PI_LOGO_FIT,
  playInBoardCols,
  type PlayInBar,
  type PlayInSlotRect,
} from "./playInLayout";
import type { PlayInDraft } from "./playInState";

interface PlayInGraphicProps {
  draft: PlayInDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  onTitleChange: (value: string) => void;
  onPick: (conference: "east" | "west", index: number) => void;
}

export const PlayInGraphic = forwardRef<HTMLElement, PlayInGraphicProps>(
  function PlayInGraphic(
    { draft, look = "white", purpleFlair = false, onTitleChange, onPick },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(1);
    const cols = playInBoardCols(draft.size);

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

    const u = (value: number) => `calc(${value} * var(--u))`;

    const paintBar = (bar: PlayInBar, key: string) => (
      <span
        key={key}
        className="pi-bar"
        aria-hidden="true"
        style={{
          left: u(bar.x),
          top: u(bar.y),
          width: u(bar.w),
          height: u(bar.h),
        }}
      />
    );

    const slotButton = (
      conference: "east" | "west",
      slot: PlayInSlotRect,
      bye = false,
    ) => {
      const ids = conference === "east" ? draft.east : draft.west;
      const team = getTeam(ids[slot.index]);
      return (
        <button
          key={`${conference}-${slot.seed}`}
          type="button"
          className={["pi-slot", bye ? "is-bye" : ""].filter(Boolean).join(" ")}
          style={{
            left: u(slot.x),
            top: u(slot.y),
            width: u(slot.w),
            height: u(slot.h),
          }}
          aria-label={`${conference} seed ${slot.seed}${bye ? ` ${PI_BYE_LABEL}` : ""}`}
          onClick={() => onPick(conference, slot.index)}
        >
          <span
            className="pi-badge"
            style={{
              left: u(slot.badge.x - slot.x),
              top: u(slot.badge.y - slot.y),
              width: u(slot.badge.w),
              height: u(slot.badge.h),
            }}
          >
            {slot.seed}
          </span>
          {bye ? <span className="pi-bye">{PI_BYE_LABEL}</span> : null}
          {team ? (
            <>
              <TeamLogo
                src={team.logoSrc}
                label={team.name}
                fitX={PI_LOGO_FIT}
                fitY={PI_LOGO_FIT}
              />
              <span className="pi-abbr">{team.id}</span>
            </>
          ) : (
            <span className="pi-empty">PICK</span>
          )}
        </button>
      );
    };

    return (
      <article
        ref={setRefs}
        className={[
          "pi-board",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ["--u" as string]: `${unit}px` } as React.CSSProperties}
        aria-label="Instagram play-in graphic"
      >
        {draft.showBa !== false ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        <input
          className="pi-title"
          value={draft.title}
          maxLength={32}
          spellCheck={false}
          aria-label="Play-in title"
          onChange={(event) => onComposerTextChange(event, onTitleChange, 32)}
        />
        <p className="pi-kicker">{PI_KICKER}</p>
        {cols.map((col) => (
          <div key={col.conference}>
            <p
              className={`pi-conf is-${col.conference}`}
              style={{
                left: u(col.x),
                top: u(col.y),
                width: u(col.w),
              }}
            >
              {col.label}
            </p>
            {col.bye ? slotButton(col.conference, col.bye, true) : null}
            {col.matches.map((match) => (
              <div key={`${col.conference}-${match.label}`}>
                {match.lines.map((bar, index) =>
                  paintBar(bar, `${col.conference}-${match.label}-l${index}`),
                )}
                <p
                  className="pi-match-label"
                  style={{
                    left: u(match.winner.x),
                    top: u(match.labelY - 8),
                    width: u(match.winner.w),
                  }}
                >
                  {match.label}
                </p>
                {slotButton(col.conference, match.slots[0])}
                {slotButton(col.conference, match.slots[1])}
                <p
                  className="pi-plate"
                  style={{
                    left: u(match.winner.x),
                    top: u(match.winner.y),
                    width: u(match.winner.w),
                    height: u(match.winner.h),
                  }}
                >
                  {match.winner.label}
                </p>
              </div>
            ))}
            {col.eightLines.map((bar, index) =>
              paintBar(bar, `${col.conference}-eight-${index}`),
            )}
            <p
              className="pi-plate is-eight"
              style={{
                left: u(col.eightSeed.x),
                top: u(col.eightSeed.y),
                width: u(col.eightSeed.w),
                height: u(col.eightSeed.h),
              }}
            >
              {col.eightSeed.label}
            </p>
          </div>
        ))}
        <p className="pi-legend">{PI_LEGEND}</p>
      </article>
    );
  },
);
