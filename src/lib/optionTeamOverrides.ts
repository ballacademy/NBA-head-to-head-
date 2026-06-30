import optionTeamData from "../../data/nba-option-team-overrides-202627.json";
import { CURRENT_TEAM_OVERRIDES } from "./currentTeamOverrides";

interface OptionTeamOverrideFile {
  overrides?: Record<string, string>;
}

const overrideFile = optionTeamData as OptionTeamOverrideFile;

export const OPTION_TEAM_OVERRIDES: Readonly<Record<string, string>> = Object.freeze(
  overrideFile.overrides ?? {},
);

export const applyOptionTeamOverride = (
  bbrPlayerId: string | undefined,
  team: string,
) => {
  if (!bbrPlayerId) {
    return team;
  }

  if (CURRENT_TEAM_OVERRIDES[bbrPlayerId]) {
    return team;
  }

  return OPTION_TEAM_OVERRIDES[bbrPlayerId] ?? team;
};
