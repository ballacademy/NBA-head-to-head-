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
import { playInSeeds, type PlayInDraft } from "./playInState";

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
    const seeds = playInSeeds(draft.size);

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

    const column = (conference: "east" | "west", label: string) => (
      <div className="pi-col">
        <p className="pi-conf">{label}</p>
        {seeds.map((seed, index) => {
          const id = (conference === "east" ? draft.east : draft.west)[index];
          const team = getTeam(id);
          return (
            <button
              key={`${conference}-${seed}`}
              type="button"
              className="pi-slot"
              aria-label={`${label} seed ${seed}`}
              onClick={() => onPick(conference, index)}
            >
              <span className="pi-seed">{seed}</span>
              {team ? (
                <TeamLogo src={team.logoSrc} label={team.name} />
              ) : (
                <span className="pi-empty">PICK</span>
              )}
            </button>
          );
        })}
      </div>
    );

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
        <div className="pi-cols">
          {column("east", "EAST")}
          {column("west", "WEST")}
        </div>
      </article>
    );
  },
);
