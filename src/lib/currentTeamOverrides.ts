import teamOverrideData from "../../data/nba-current-teams.json";

interface TeamOverrideFile {
  description?: string;
  source?: string;
  rosterAsOf?: string;
  overrides?: Record<string, string>;
}

const overrideFile = teamOverrideData as TeamOverrideFile;

export const CURRENT_TEAM_OVERRIDES: Readonly<Record<string, string>> = Object.freeze(
  overrideFile.overrides ?? {},
);

export const applyCurrentTeamOverride = (
  bbrPlayerId: string | undefined,
  team: string,
) => {
  if (!bbrPlayerId) {
    return team;
  }

  return CURRENT_TEAM_OVERRIDES[bbrPlayerId] ?? team;
};
