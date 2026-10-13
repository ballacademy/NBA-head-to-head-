import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import { NAME_FIRST_MAX, NAME_LAST_MAX } from "./nameFit";
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
  return (
    <div
      className={["ig-name-fade", flushLeft ? "is-flush-left" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {team ? (
        <div className="ig-name-fade__logo">
          <TeamLogo src={team.logoSrc} label="" fitX={0.88} fitY={0.88} />
        </div>
      ) : null}
      <div className="ig-name-fade__stack">
        <input
          className="ig-name-fade__given"
          value={firstName}
          maxLength={NAME_FIRST_MAX}
          placeholder={empty ? "" : "FIRST"}
          aria-label={givenAria}
          onChange={(event) =>
            onFirstChange(event.target.value.slice(0, NAME_FIRST_MAX))
          }
          onClick={() => {
            if (empty) {
              onEmptyClick();
            }
          }}
        />
        <textarea
          className="ig-name-fade__family"
          value={lastName}
          maxLength={NAME_LAST_MAX}
          rows={2}
          placeholder={empty ? "" : "LAST"}
          aria-label={familyAria}
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
