import { readFileSync, writeFileSync } from "node:fs";
import { getStarTierLineupBonus } from "../src/lib/lineupMatchupBonus";
import { players, statsFile } from "../src/lib/playerPool";
import {
  calculateLineupStatRawTotal,
  normalizeLineupTotal,
} from "../src/lib/scoring";

const IMPACT_BLEND_MAX_RAW = 2;
const RANKINGS_PATH = new URL("./data/user-impact-rankings.tsv", import.meta.url);

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const stripNameSuffix = (value: string) =>
  value.replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, "").trim();

const parseDisplayName = (name: string) => {
  const parts = name.trim().split(/\s+/);

  if (parts.length < 2) {
    return { first: name, last: name };
  }

  const suffixPattern = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
  let last = parts.at(-1) ?? "";
  let firstParts = parts.slice(0, -1);

  if (suffixPattern.test(last) && firstParts.length >= 1) {
    const actualLast = firstParts.at(-1) ?? last;
    firstParts = firstParts.slice(0, -1);
    last = `${actualLast} ${last}`;
  } else if (
    firstParts.length >= 2 &&
    suffixPattern.test(firstParts.at(-1) ?? "")
  ) {
    const suffix = firstParts.at(-1) ?? "";
    firstParts = firstParts.slice(0, -1);
    last = `${last} ${suffix}`;
  }

  return {
    first: firstParts.join(" "),
    last,
  };
};

const FIRST_NAME_ALIASES: Record<string, string> = {
  herb: "herbert",
  wong: "isaiah",
};

const userKey = (last: string, first: string) =>
  normalizeKey(`${first}${last}`);

const playerKey = (name: string) => {
  const { first, last } = parseDisplayName(name);
  return userKey(last, first);
};

const firstNameMatches = (userFirst: string, poolFirst: string) => {
  const user = normalizeKey(userFirst);
  const pool = normalizeKey(poolFirst);

  if (user === pool) {
    return true;
  }

  if (user.length >= 3 && pool.startsWith(user)) {
    return true;
  }

  if (pool.length >= 3 && user.startsWith(pool)) {
    return true;
  }

  const alias = FIRST_NAME_ALIASES[user];
  return Boolean(alias && normalizeKey(alias) === pool);
};

const lastNameMatches = (userLast: string, poolLast: string) =>
  normalizeKey(stripNameSuffix(userLast)) === normalizeKey(stripNameSuffix(poolLast));

interface MatchCandidate {
  bbrPlayerId: string;
  name: string;
  inPool: boolean;
}

const rosterCandidates = statsFile.players
  .filter((player) => player.gamesPlayed > 0 && player.bbrPlayerId)
  .map((player) => ({
    bbrPlayerId: player.bbrPlayerId!,
    name: player.name,
    inPool: false,
  }));

const poolByKey = new Map<string, MatchCandidate[]>();

for (const player of players) {
  if (!player.bbrPlayerId) {
    continue;
  }

  const key = playerKey(player.name);
  const entries = poolByKey.get(key) ?? [];
  entries.push({
    bbrPlayerId: player.bbrPlayerId,
    name: player.name,
    inPool: true,
  });
  poolByKey.set(key, entries);
}

for (const candidate of rosterCandidates) {
  const key = playerKey(candidate.name);
  const entries = poolByKey.get(key) ?? [];
  if (!entries.some((entry) => entry.bbrPlayerId === candidate.bbrPlayerId)) {
    entries.push(candidate);
    poolByKey.set(key, entries);
  }
}

const findCandidates = (name: string) => {
  const key = playerKey(name);
  const direct = poolByKey.get(key) ?? [];

  if (direct.length > 0) {
    return direct;
  }

  const { first, last } = parseDisplayName(name);

  return rosterCandidates.filter((candidate) => {
    const parts = candidate.name.trim().split(/\s+/);
    const poolLast = parts.at(-1) ?? "";
    const poolFirst = parts.slice(0, -1).join(" ");
    return lastNameMatches(last, poolLast) && firstNameMatches(first, poolFirst);
  });
};

const rankToPercentile = (rank: number, total: number) =>
  total <= 1 ? 0.5 : 1 - (rank - 1) / (total - 1);

const rankingsText = readFileSync(RANKINGS_PATH, "utf8");
const seenNames = new Set<string>();
const userRanks: Array<{ rank: number; name: string }> = [];

for (const line of rankingsText.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("Rank")) {
    continue;
  }

  const match = trimmed.match(/^(\d+)\s+(.+)$/);
  if (!match) {
    continue;
  }

  const rank = Number(match[1]);
  const name = match[2].trim();
  const dedupeKey = playerKey(name);

  if (seenNames.has(dedupeKey)) {
    continue;
  }

  seenNames.add(dedupeKey);
  userRanks.push({ rank, name });
}

const ranks: Record<string, number> = {};
const adjustments: Record<string, number> = {};
const matched: Array<{ rank: number; user: string; player: string; inPool: boolean }> =
  [];
const unmatched: string[] = [];
const ambiguous: string[] = [];

for (const entry of userRanks) {
  const candidates = findCandidates(entry.name);

  if (candidates.length === 0) {
    unmatched.push(`${entry.rank}\t${entry.name}`);
    continue;
  }

  if (candidates.length > 1) {
    ambiguous.push(
      `${entry.rank}\t${entry.name} -> ${candidates.map((candidate) => candidate.name).join(" | ")}`,
    );
  }

  const pick =
    candidates.find((candidate) => candidate.inPool) ?? candidates[0]!;

  ranks[pick.bbrPlayerId] = entry.rank;
  matched.push({
    rank: entry.rank,
    user: entry.name,
    player: pick.name,
    inPool: pick.inPool,
  });
}

const statSorted = [...players]
  .filter((player) => player.bbrPlayerId)
  .map((player) => ({
    bbrPlayerId: player.bbrPlayerId!,
    ovr: normalizeLineupTotal(
      calculateLineupStatRawTotal([player]) + getStarTierLineupBonus([player]),
    ),
  }))
  .sort(
    (left, right) =>
      right.ovr - left.ovr || left.bbrPlayerId.localeCompare(right.bbrPlayerId),
  );

const statRankById = new Map(
  statSorted.map((entry, index) => [entry.bbrPlayerId, index + 1]),
);
const poolSize = statSorted.length;
const rankedCount = Object.keys(ranks).length;

for (const [bbrPlayerId, userRank] of Object.entries(ranks)) {
  const statRank = statRankById.get(bbrPlayerId);
  if (!statRank) {
    continue;
  }

  const delta =
    rankToPercentile(userRank, rankedCount) -
    rankToPercentile(statRank, poolSize);
  const adjustment = Math.max(
    -IMPACT_BLEND_MAX_RAW,
    Math.min(IMPACT_BLEND_MAX_RAW, delta * IMPACT_BLEND_MAX_RAW),
  );

  adjustments[bbrPlayerId] = Number(adjustment.toFixed(3));
}

const poolMatchedCount = matched.filter((entry) => entry.inPool).length;
const outputPath = new URL("../data/impact-ranking-overrides.json", import.meta.url);

writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      source: "user-provided impact rankings",
      generatedAt: new Date().toISOString(),
      blendMaxRaw: IMPACT_BLEND_MAX_RAW,
      rankedCount,
      poolMatchedCount,
      ranks,
      adjustments,
    },
    null,
    2,
  )}\n`,
);

console.log(`Matched ${matched.length} ranked players (${poolMatchedCount} in draft pool)`);
console.log(`Computed ${Object.keys(adjustments).length} pool adjustments`);
console.log(`Unmatched: ${unmatched.length}`);
if (unmatched.length) {
  console.log(unmatched.slice(0, 25).join("\n"));
}
if (ambiguous.length) {
  console.log(`Ambiguous: ${ambiguous.length}`);
  console.log(ambiguous.slice(0, 10).join("\n"));
}
