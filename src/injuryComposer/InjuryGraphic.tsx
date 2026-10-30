import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  formatComposerPersonName,
  useComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import {
  INJURY_KICKER_FILL,
  INJURY_KICKER_INK,
  cycleInjuryKicker,
  injuryFillLayout,
  splitInjuryTitle,
  type InjuryDraft,
  type InjuryKicker,
} from "./injuryState";

interface InjuryGraphicProps {
  draft: InjuryDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  exporting?: boolean;
  story?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onKickerChange: (value: string) => void;
  onDateLineChange: (value: string) => void;
  onStatusCycle?: (teamId: string, playerId: string, status: InjuryKicker) => void;
}

export const InjuryGraphic = forwardRef<HTMLElement, InjuryGraphicProps>(
  function InjuryGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      exporting = false,
      story = false,
      onBrandChange,
      onTitleChange,
      onKickerChange,
      onDateLineChange,
      onStatusCycle,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const [nameStyle] = useComposerNameStyle();
    const titleLines = splitInjuryTitle(draft.title);
    const fill = injuryFillLayout(draft.teams.length);

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
          "inj-board",
          exporting ? "is-exporting" : "",
          story ? "is-story" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--inj-rows" as string]: String(fill.rows),
            ["--inj-logo" as string]: String(fill.logo),
            ["--inj-name" as string]: String(fill.name),
            ["--inj-pip" as string]: String(fill.pipH),
            ["--inj-pip-size" as string]: String(fill.pipSize),
          } as CSSProperties
        }
        aria-label="Instagram injury report graphic"
      >
        {draft.showBa ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        {draft.showBa ? null : (
          <input
            className="inj-brand"
            value={draft.brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand label"
            onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
          />
        )}
        <div className="inj-title-block">
          <ComposerTitleField
            value={draft.title}
            lines={titleLines}
            ariaLabel="Injury report title"
            inputClassName="inj-title-input"
            lineClassName="inj-title-line"
            onChange={onTitleChange}
          />
        </div>
        <input
          className="inj-kicker"
          value={draft.kicker}
          maxLength={18}
          spellCheck={false}
          aria-label="Injury kicker"
          onChange={(event) =>
            onKickerChange(event.target.value.slice(0, 18))
          }
        />
        <input
          className="inj-date"
          value={draft.dateLine}
          maxLength={40}
          spellCheck={false}
          aria-label="Injury date line"
          onChange={(event) =>
            onDateLineChange(event.target.value.slice(0, 40))
          }
        />
        <div className="inj-list">
          {draft.teams.length ? (
            draft.teams.map((block) => {
              const team = getTeam(block.teamId);
              return (
                <section key={block.teamId} className="inj-team">
                  <div className="inj-team__mark">
                    <span className="inj-team__logo">
                      {team ? (
                        <TeamLogo src={team.logoSrc} label={team.id} shadow={0} />
                      ) : null}
                    </span>
                    <span>{block.teamId}</span>
                  </div>
                  <div className="inj-team__rows">
                    {block.players.map((player) => (
                      <div key={`${block.teamId}-${player.id}`} className="inj-row">
                        <button
                          type="button"
                          className="inj-pip"
                          disabled={exporting || !onStatusCycle}
                          aria-label={`Cycle ${player.name} status`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onStatusCycle?.(
                              block.teamId,
                              player.id,
                              cycleInjuryKicker(player.status),
                            );
                          }}
                          style={
                            {
                              ["--pip-fill" as string]:
                                INJURY_KICKER_FILL[player.status as InjuryKicker],
                              ["--pip-ink" as string]:
                                INJURY_KICKER_INK[player.status as InjuryKicker],
                            } as CSSProperties
                          }
                        >
                          {player.status}
                        </button>
                        <span className="inj-name">
                          {formatComposerPersonName(player.name, nameStyle) ||
                            player.shortName}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <p className="inj-empty">Fill the injury report to load OUT / GTD</p>
          )}
        </div>
      </article>
    );
  },
);
