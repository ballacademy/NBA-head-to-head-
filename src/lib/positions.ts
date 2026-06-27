import type { Position } from "./types";

const POSITION_ORDER: Position[] = ["PG", "SG", "SF", "PF", "C"];

const POSITION_RANK = Object.fromEntries(
  POSITION_ORDER.map((position, index) => [position, index]),
) as Record<Position, number>;

export const MAX_PLAYER_POSITIONS = 2;

export const comparePositions = (left: Position, right: Position) =>
  POSITION_RANK[left] - POSITION_RANK[right];

export const sortPositions = (positions: Iterable<Position>) =>
  [...new Set(positions)].sort(comparePositions);

export const capPositions = (positions: Iterable<Position>) =>
  sortPositions(positions).slice(0, MAX_PLAYER_POSITIONS);

export const normalizePosition = (position?: string): Position => {
  const value = (position ?? "SF").toUpperCase();

  if (value.includes("PG") || value === "G") {
    return "PG";
  }
  if (value.includes("SG")) {
    return "SG";
  }
  if (value.includes("SF") || value === "F") {
    return "SF";
  }
  if (value.includes("PF")) {
    return "PF";
  }
  if (value.includes("C")) {
    return "C";
  }

  return "SF";
};

export const parsePrimaryPosition = (position?: string): Position => {
  if (!position?.trim()) {
    return "SF";
  }

  const firstToken = position
    .toUpperCase()
    .split(/[-/,]/)[0]
    ?.trim();

  if (firstToken) {
    const fromToken = parsePositionString(firstToken);
    if (fromToken.length > 0) {
      return fromToken[0];
    }
  }

  return normalizePosition(position);
};

const finalizePositions = (
  primary: Position,
  eligible: Iterable<Position>,
): Position[] => {
  const unique = new Set(eligible);
  unique.add(primary);

  const resolved = [primary];

  for (const position of POSITION_ORDER) {
    if (position === primary || !unique.has(position)) {
      continue;
    }

    resolved.push(position);

    if (resolved.length >= MAX_PLAYER_POSITIONS) {
      break;
    }
  }

  return resolved;
};

export const parsePositionString = (position?: string): Position[] => {
  if (!position?.trim()) {
    return [];
  }

  const normalized = position.toUpperCase();
  const tokens = normalized
    .split(/[-/,]/)
    .map((token) => token.trim())
    .filter(Boolean);
  const found = new Set<Position>();

  for (const token of tokens.length > 0 ? tokens : [normalized]) {
    if (token === "G" || token === "GUARD") {
      found.add("PG");
      found.add("SG");
      continue;
    }

    if (token === "F" || token === "FORWARD") {
      found.add("SF");
      found.add("PF");
      continue;
    }

    if (token === "PG" || token === "POINT GUARD") {
      found.add("PG");
      continue;
    }
    if (token === "SG" || token === "SHOOTING GUARD") {
      found.add("SG");
      continue;
    }
    if (token === "SF" || token === "SMALL FORWARD") {
      found.add("SF");
      continue;
    }
    if (token === "PF" || token === "POWER FORWARD") {
      found.add("PF");
      continue;
    }
    if (token === "C" || token === "CENTER") {
      found.add("C");
      continue;
    }

    if (token.includes("PG")) {
      found.add("PG");
    }
    if (token.includes("SG")) {
      found.add("SG");
    }
    if (token.includes("SF")) {
      found.add("SF");
    }
    if (token.includes("PF")) {
      found.add("PF");
    }
    if (/\bC\b/.test(token) || token.endsWith("C")) {
      found.add("C");
    }
  }

  return capPositions(found);
};

interface PositionStatInput {
  position?: string;
  positions?: string[];
  assists: number;
  rebounds: number;
  blocks: number;
}

const pickStatSecondary = (
  primary: Position,
  stats: Pick<PositionStatInput, "assists" | "rebounds" | "blocks">,
): Position | null => {
  switch (primary) {
    case "PG":
      return stats.assists >= 4 ? "SG" : null;
    case "SG":
      if (stats.assists >= 5) {
        return "PG";
      }
      if (stats.assists >= 3.5 || stats.rebounds >= 4.5) {
        return "SF";
      }
      return null;
    case "SF":
      if (stats.rebounds >= 7 || stats.blocks >= 1) {
        return "PF";
      }
      if (stats.assists >= 4.5) {
        return "SG";
      }
      return null;
    case "PF":
      if (
        (stats.rebounds >= 10 && stats.blocks >= 1.2) ||
        (stats.rebounds >= 9.5 && stats.blocks >= 1.5)
      ) {
        return "C";
      }
      if (stats.rebounds >= 6.5) {
        return "SF";
      }
      return null;
    case "C":
      return stats.rebounds < 8.5 && stats.blocks < 1 ? "PF" : null;
    default:
      return null;
  }
};

export const buildPlayerPositions = ({
  position,
  positions,
  assists,
  rebounds,
  blocks,
}: PositionStatInput): Position[] => {
  const primary = parsePrimaryPosition(position);
  const parsed = sortPositions([
    ...parsePositionString(position),
    ...(positions ?? []).flatMap((value) => parsePositionString(value)),
  ]);
  const listed = parsed.length > 0 ? parsed : [primary];

  if (listed.length >= MAX_PLAYER_POSITIONS && listed.includes(primary)) {
    return finalizePositions(primary, listed);
  }

  const secondary = pickStatSecondary(primary, { assists, rebounds, blocks });
  const eligible = new Set(listed);

  if (secondary) {
    eligible.add(secondary);
  }

  return finalizePositions(primary, eligible);
};

export const formatPlayerPositions = (positions: readonly Position[]) =>
  positions.join(" / ");

export const playerMatchesPosition = (
  player: { positions: readonly Position[] },
  position: Position,
) => player.positions.includes(position);
