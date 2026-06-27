export const FREE_AGENT_TEAM = "FA";

export const isFreeAgentTeam = (team: string) => team === FREE_AGENT_TEAM;

export const formatTeamLabel = (team: string) =>
  isFreeAgentTeam(team) ? "FA" : team;

export const hasPlayerContract = (player: {
  bbrPlayerId?: string;
  id: string;
  salary?: number;
}) => typeof player.salary === "number";

export const isDraftEligiblePlayer = (player: {
  team: string;
  bbrPlayerId?: string;
  id: string;
  salary?: number;
}) => hasPlayerContract(player) && !isFreeAgentTeam(player.team);

export const isStatsFreeAgent = (player: {
  team: string;
  bbrPlayerId?: string;
  id: string;
  salary?: number;
}) => !isDraftEligiblePlayer(player);

export const getPlayerTeamLabel = (player: {
  team: string;
  bbrPlayerId?: string;
  id: string;
  salary?: number;
}) => (isStatsFreeAgent(player) ? FREE_AGENT_TEAM : formatTeamLabel(player.team));
