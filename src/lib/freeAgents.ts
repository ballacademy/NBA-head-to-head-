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

export const getPlayerLastTeam = (player: {
  team: string;
  lastTeam?: string;
}) => (isFreeAgentTeam(player.team) ? player.lastTeam : undefined);

export const getPlayerTeamGroupingKey = (player: {
  team: string;
  lastTeam?: string;
}) => {
  if (!isFreeAgentTeam(player.team)) {
    return player.team;
  }

  return player.lastTeam ?? "ZZZ";
};

export const getPlayerTeamSearchText = (player: {
  team: string;
  lastTeam?: string;
}) => {
  const parts = [formatTeamLabel(player.team)];

  const lastTeam = getPlayerLastTeam(player);
  if (lastTeam) {
    parts.push(lastTeam);
  }

  return parts.join(" ");
};

export const comparePlayersForTeamColumn = (
  left: { team: string; lastTeam?: string; name: string },
  right: { team: string; lastTeam?: string; name: string },
  direction: "asc" | "desc",
) => {
  const groupComparison = getPlayerTeamGroupingKey(left).localeCompare(
    getPlayerTeamGroupingKey(right),
  );

  if (groupComparison !== 0) {
    return direction === "asc" ? groupComparison : -groupComparison;
  }

  const freeAgentRank = (player: { team: string }) =>
    isFreeAgentTeam(player.team) ? 1 : 0;
  const rosterComparison = freeAgentRank(left) - freeAgentRank(right);

  if (rosterComparison !== 0) {
    return rosterComparison;
  }

  return left.name.localeCompare(right.name);
};
