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
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import {
  scheduleFillLayout,
  scheduleGroups,
  splitScheduleTitle,
  type ScheduleDraft,
} from "./scheduleState";

interface ScheduleGraphicProps {
  draft: ScheduleDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  exporting?: boolean;
  story?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onWeekLineChange: (value: string) => void;
}

export const ScheduleGraphic = forwardRef<HTMLElement, ScheduleGraphicProps>(
  function ScheduleGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      exporting = false,
      story = false,
      onBrandChange,
      onTitleChange,
      onWeekLineChange,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const titleLines = splitScheduleTitle(draft.title);
    const groups = scheduleGroups(draft.games);
    const fill = scheduleFillLayout(groups);

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
          "sch-board",
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
            ["--sch-logo" as string]: String(fill.logo),
            ["--sch-type" as string]: String(fill.type),
            ["--sch-time" as string]: String(fill.time),
            ["--sch-label" as string]: String(fill.labelH),
          } as CSSProperties
        }
        aria-label="Instagram schedule poster"
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
            className="sch-brand"
            value={draft.brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand label"
            onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
          />
        )}
        <div className="sch-title-block">
          <ComposerTitleField
            value={draft.title}
            lines={titleLines}
            ariaLabel="Schedule title"
            inputClassName="sch-title-input"
            lineClassName="sch-title-line"
            onChange={onTitleChange}
          />
        </div>
        <input
          className="sch-week"
          value={draft.weekLine}
          maxLength={40}
          spellCheck={false}
          aria-label="Schedule date range"
          onChange={(event) =>
            onWeekLineChange(event.target.value.slice(0, 40))
          }
        />
        <div className="sch-list">
          {groups.length ? (
            groups.map((group) => (
              <section key={group.date} className="sch-day">
                <h2 className="sch-day__label">{group.label}</h2>
                <div className="sch-day__games">
                {group.games.map((game) => {
                  const away = getTeam(game.awayId);
                  const home = getTeam(game.homeId);
                  return (
                    <div key={game.eventId || `${game.awayId}-${game.homeId}-${game.timeLabel}`} className="sch-game">
                      <div className="sch-game__side">
                        <span className="sch-game__logo">
                          {away ? (
                            <TeamLogo src={away.logoSrc} label={away.id} shadow={0} />
                          ) : null}
                        </span>
                        <span>{game.awayId}</span>
                      </div>
                      <span className="sch-game__at">@</span>
                      <div className="sch-game__side">
                        <span className="sch-game__logo">
                          {home ? (
                            <TeamLogo src={home.logoSrc} label={home.id} shadow={0} />
                          ) : null}
                        </span>
                        <span>{game.homeId}</span>
                      </div>
                      <span className="sch-game__time">{game.timeLabel}</span>
                    </div>
                  );
                })}
                </div>
              </section>
            ))
          ) : (
            <p className="sch-empty">Fill next 7 or a custom range</p>
          )}
        </div>
      </article>
    );
  },
);
