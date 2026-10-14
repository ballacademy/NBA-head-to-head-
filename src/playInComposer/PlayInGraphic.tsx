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
  PI_LOGO_FIT,
  playInBoardCols,
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
            left: `calc(${slot.x} * var(--u))`,
            top: `calc(${slot.y} * var(--u))`,
            width: `calc(${slot.w} * var(--u))`,
            height: `calc(${slot.h} * var(--u))`,
          }}
          aria-label={`${conference} seed ${slot.seed}${bye ? ` ${PI_BYE_LABEL}` : ""}`}
          onClick={() => onPick(conference, slot.index)}
        >
          <span className="pi-seed">{slot.seed}</span>
          {bye ? <span className="pi-bye">{PI_BYE_LABEL}</span> : null}
          {team ? (
            <TeamLogo
              src={team.logoSrc}
              label={team.name}
              fitX={PI_LOGO_FIT}
              fitY={PI_LOGO_FIT}
            />
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
        {cols.map((col) => (
          <div key={col.conference}>
            <p
              className="pi-conf"
              style={{
                left: `calc(${col.x} * var(--u))`,
                top: `calc(${col.y} * var(--u))`,
                width: `calc(${col.w} * var(--u))`,
              }}
            >
              {col.label}
            </p>
            {col.bye ? slotButton(col.conference, col.bye, true) : null}
            {col.matches.map((match) => (
              <div key={`${col.conference}-${match.label}`}>
                <p
                  className="pi-match-label"
                  style={{
                    left: `calc(${col.x} * var(--u))`,
                    top: `calc(${match.labelY - 11} * var(--u))`,
                    width: `calc(${col.w} * var(--u))`,
                  }}
                >
                  {match.label}
                </p>
                {slotButton(col.conference, match.slots[0])}
                {slotButton(col.conference, match.slots[1])}
                <div
                  className={`pi-bracket is-${match.line.side}`}
                  aria-hidden="true"
                  style={{
                    left: `calc(${match.line.x} * var(--u))`,
                    top: `calc(${match.line.y} * var(--u))`,
                    width: `calc(${match.line.w} * var(--u))`,
                    height: `calc(${match.line.h} * var(--u))`,
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </article>
    );
  },
);
