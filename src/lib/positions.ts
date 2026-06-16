import type { Position } from "./types";

const POSITION_ORDER: Position[] = ["PG", "SG", "SF", "PF", "C"];

const POSITION_RANK = Object.fromEntries(
  POSITION_ORDER.map((position, index) => [position, index]),
) as Record<Position, number>;

export const sortPositions = (positions: Iterable<Position>) =>
  [...new Set(positions)].sort(
    (left, right) => POSITION_RANK[left] - POSITION_RANK[right],
  );

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
    if (token.includes("C")) {
      found.add("C");
    }
  }

  return sortPositions(found);
};

interface PositionStatInput {
  position?: string;
  positions?: string[];
  assists: number;
  rebounds: number;
  blocks: number;
}

export const buildPlayerPositions = ({
  position,
  positions,
  assists,
  rebounds,
  blocks,
}: PositionStatInput): Position[] => {
  const parsed = sortPositions([
    ...parsePositionString(position),
    ...(positions ?? []).flatMap((value) => parsePositionString(value)),
  ]);

  const base = parsed.length > 0 ? parsed : [normalizePosition(position)];
  const eligible = new Set(base);
  const primary = base[0];

  if (primary === "PG" || (eligible.has("PG") && assists >= 3)) {
    eligible.add("SG");
  }

  if (primary === "SG" && assists >= 4.5) {
    eligible.add("PG");
  }

  if (primary === "SF" && assists >= 4) {
    eligible.add("SG");
  }

  if (primary === "SF" && (rebounds >= 5.5 || blocks >= 0.8)) {
    eligible.add("PF");
  }

  if (primary === "PF" && rebounds >= 5) {
    eligible.add("SF");
  }

  if (primary === "PF" && (rebounds >= 8 || blocks >= 1)) {
    eligible.add("C");
  }

  if (primary === "C" && rebounds < 8.5) {
    eligible.add("PF");
  }

  return sortPositions(eligible);
};

export const formatPlayerPositions = (positions: readonly Position[]) =>
  positions.join(" / ");

export const playerMatchesPosition = (
  player: { positions: readonly Position[] },
  position: Position,
) => player.positions.includes(position);
