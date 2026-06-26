export const FREE_AGENT_TEAM = "FA";

export const isFreeAgentTeam = (team: string) => team === FREE_AGENT_TEAM;

export const formatTeamLabel = (team: string) =>
  isFreeAgentTeam(team) ? "FA" : team;
