import jerseyData from "../../data/nba-jersey-numbers.json";

interface JerseyEntry {
  jerseyNumber: number;
  team: string;
}

interface JerseyNumbersFile {
  byPlayerId: Record<string, JerseyEntry>;
}

const file = jerseyData as JerseyNumbersFile;

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const lookupJerseyNumber = (
  bbrPlayerId: string | undefined,
  playerId: string,
  team: string,
) => {
  if (bbrPlayerId) {
    const entry = file.byPlayerId[bbrPlayerId];

    if (entry && entry.team === team) {
      return entry.jerseyNumber;
    }

    if (entry) {
      return entry.jerseyNumber;
    }
  }

  return hashString(`${playerId}-${team}`) % 100;
};

export const formatJerseyNumber = (jerseyNumber: number) =>
  jerseyNumber.toString();
