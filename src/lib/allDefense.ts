export const ALL_DEFENSE_FIRST_TEAM_IDS = new Set([
  // 2024-25
  "daniedy01",
  "dortlu01",
  "greendr01",
  "mobleev01",
  "thompam01",
  // 2023-24
  "goberru01",
  "wembavi01",
  "adebaba01",
  "joneshe01",
  "davisan02",
]);

export const ALL_DEFENSE_SECOND_TEAM_IDS = new Set([
  // 2024-25
  "camarto01",
  "goberru01",
  "jacksja02",
  "willija06",
  "zubaciv01",
  // 2023-24
  "carusal01",
  "suggsja01",
  "whitede01",
  "mcdanja02",
  "holidjr01",
]);

export const hasAllDefenseAccolade = (bbrPlayerId?: string) =>
  Boolean(
    bbrPlayerId &&
      (ALL_DEFENSE_FIRST_TEAM_IDS.has(bbrPlayerId) ||
        ALL_DEFENSE_SECOND_TEAM_IDS.has(bbrPlayerId)),
  );

export const isAllDefenseFirstTeam = (bbrPlayerId?: string) =>
  Boolean(bbrPlayerId && ALL_DEFENSE_FIRST_TEAM_IDS.has(bbrPlayerId));
