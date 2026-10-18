import { useLayoutEffect, useRef, useState } from "react";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import {
  NAME_FIRST_MAX,
  NAME_LAST_MAX,
  abbreviateOverflowName,
} from "./nameFit";
import { composerNameLines, useComposerNameStyle } from "./composerNameStyle";
import { measureTitleAdvance } from "./titleLayout";
import "./playerNameFade.css";

interface PlayerNameFadeProps {
  firstName: string;
  lastName: string;
  teamId: string | null;
  empty: boolean;
  givenAria: string;
  familyAria: string;
  flushLeft?: boolean;
  onFirstChange: (value: string) => void;
  onLastChange: (value: string) => void;
  onEmptyClick: () => void;
}

export function PlayerNameFade({
  firstName,
  lastName,
  teamId,
  empty,
  givenAria,
  familyAria,
  flushLeft = false,
  onFirstChange,
  onLastChange,
  onEmptyClick,
}: PlayerNameFadeProps) {
  const team = getTeam(teamId);
  const [style] = useComposerNameStyle();
  const lines = composerNameLines(firstName, lastName, style);
  const familyRef = useRef<HTMLTextAreaElement>(null);
  const [familyFit, setFamilyFit] = useState(lines.family);
  const [familyFocus, setFamilyFocus] = useState(false);
  const [givenFocus, setGivenFocus] = useState(false);
  const givenValue = givenFocus ? firstName : lines.given;
  const familySource = familyFocus ? lastName : lines.family;
  const hideGiven = style === "last" && !givenFocus && !lines.given;

  useLayoutEffect(() => {
    const node = familyRef.current;
    if (!node) {
      return;
    }
    const fit = () => {
      const max = node.clientWidth;
      const size = Number.parseFloat(getComputedStyle(node).fontSize) || 16;
      if (max <= 0 || size <= 0) {
        setFamilyFit(familySource);
        return;
      }
      setFamilyFit(
        abbreviateOverflowName(familySource, (max / size) * 0.85, (value) =>
          measureTitleAdvance(value, 0.04),
        ),
      );
    };
    fit();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [familySource]);

  return (
    <div
      className={[
        "ig-name-fade",
        flushLeft ? "is-flush-left" : "",
        hideGiven ? "is-last-only" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {team ? (
        <div className="ig-name-fade__logo">
          <TeamLogo src={team.logoSrc} label="" />
        </div>
      ) : null}
      <div className="ig-name-fade__stack">
        {hideGiven ? null : (
          <input
            className="ig-name-fade__given"
            value={givenValue}
            maxLength={NAME_FIRST_MAX}
            placeholder={empty ? "" : "FIRST"}
            aria-label={givenAria}
            onFocus={() => setGivenFocus(true)}
            onBlur={() => setGivenFocus(false)}
            onChange={(event) =>
              onFirstChange(event.target.value.slice(0, NAME_FIRST_MAX))
            }
            onClick={() => {
              if (empty) {
                onEmptyClick();
              }
            }}
          />
        )}
        <textarea
          ref={familyRef}
          className="ig-name-fade__family"
          value={familyFocus ? lastName : familyFit}
          maxLength={NAME_LAST_MAX}
          rows={1}
          placeholder={empty ? "" : "LAST"}
          aria-label={familyAria}
          onFocus={() => setFamilyFocus(true)}
          onBlur={() => setFamilyFocus(false)}
          onChange={(event) =>
            onLastChange(event.target.value.slice(0, NAME_LAST_MAX))
          }
          onClick={() => {
            if (empty) {
              onEmptyClick();
            }
          }}
        />
      </div>
    </div>
  );
}
