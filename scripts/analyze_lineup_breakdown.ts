/**
 * Print full calculateLineupScore breakdown for a named lineup.
 * Run: npx tsx scripts/analyze_lineup_breakdown.ts
 */
import { players } from "../src/lib/playerPool";
import {
  calculateLineupScore,
  buildLineupScorePipeline,
  getLowScoringLineupPenalty,
  getPrimaryScorerLineupPenalty,
  getLineupOffenseFloorPenalty,
  getNoTrueStarLineupPenalty,
  getEliteOffenseLineupBonus,
  getSuperstarStackingLineupBonus,
  hasPrimaryScorer,
  hasLineupFirstOption,
  hasStarScorer,
  hasStarTierPlayer,
  LINEUP_RAW_CEILING,
  preciseLineupOvr,
  projectedWinsFromOvr,
} from "../src/lib/scoring";
import {
  getLineupTierAdjustment,
  getLineupStarBonus,
  getImpactDepthLineupBonus,
  getScrubTierLineupPenalty,
  getPlayerLineupStarBonus,
  getPlayerTaggedStarTierBonus,
  getPlayerImpactRankLineupBonus,
} from "../src/lib/lineupMatchupBonus";
import {
  getImpactRankingAdjustment,
  getMidTierImpactLineupPenalty,
  getPlayerImpactRank,
  getPlayerImpactAdjustment,
  getLineupBestImpactRank,
  isImpactRankStarPlayer,
} from "../src/lib/impactRanking";
import { getChemistryAdjustment, getActiveChemistryBonuses } from "../src/lib/chemistry";
import { getLineupTeamQualityRawAdjustment } from "../src/lib/teamRecordBaseline";
import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "../src/lib/allStars";
import { isScrubPlayer, isSuperScrubPlayer } from "../src/lib/playerTiers";
import { getPlayerSalary } from "../src/lib/playerSalaries";
import type { Player } from "../src/lib/types";

const TARGET_NAMES = [
  "Kobe Sanders",
  "Kyrie Irving",
  "Josh Minott",
  "Jerami Grant",
  "Luka Garza",
];

const normalize = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const findByName = (name: string): Player | undefined => {
  const target = normalize(name);
  const exact = players.find((p) => normalize(p.name) === target);
  if (exact) return exact;
  return players.find(
    (p) =>
      normalize(p.name).includes(target) ||
      target.includes(normalize(p.name)),
  );
};

const lineup = TARGET_NAMES.map((name) => {
  const player = findByName(name);
  if (!player) {
    throw new Error(`Player not found: ${name}`);
  }
  return player;
});

console.log("=== PLAYERS ===");
for (const p of lineup) {
  console.log({
    name: p.name,
    id: p.id,
    bbrPlayerId: p.bbrPlayerId,
    team: p.team,
    statsTeam: p.statsTeam,
    positions: p.positions,
    gp: p.gamesPlayed,
    mpg: p.minutes,
    pts: p.points,
    reb: p.rebounds,
    ast: p.assists,
    stl: p.steals,
    blk: p.blocks,
    ts: p.trueShooting,
    threePoint: p.threePoint,
    usage: p.usage,
    defense: p.defense,
    defenseGrade: p.defenseGrade,
    styles: p.styles,
    salary: getPlayerSalary(p.bbrPlayerId, p.id),
    impactRank: getPlayerImpactRank(p),
    impactAdj: getPlayerImpactAdjustment(p),
    superstar: isSuperstarPlayer(p),
    allStar2026: isAllStarPlayer(p),
    recentAllStar: isRecentAllStarPlayer(p),
    impactStar: isImpactRankStarPlayer(p),
    scrub: isScrubPlayer(p),
    superScrub: isSuperScrubPlayer(p),
    taggedStarBonus: getPlayerTaggedStarTierBonus(p),
    impactRankBonus: getPlayerImpactRankLineupBonus(p),
    starBonusUsed: getPlayerLineupStarBonus(p),
  });
}

const score = calculateLineupScore(lineup);
const totalPoints = lineup.reduce((s, p) => s + p.points, 0);
const productionRounded =
  score.categories.find((c) => c.label === "Box score production")?.value ?? 0;
// Elite bonus uses unrounded production internally; bracket with rounded ±0.5.
const eliteFromRounded = getEliteOffenseLineupBonus(productionRounded, totalPoints);
const eliteFromFloor = getEliteOffenseLineupBonus(productionRounded - 0.5, totalPoints);
const eliteFromCeil = getEliteOffenseLineupBonus(productionRounded + 0.5, totalPoints);

const modifiers = {
  tierAdjustment: getLineupTierAdjustment(lineup),
  impactBlend: getImpactRankingAdjustment(lineup),
  chemistry: getChemistryAdjustment(lineup),
  teamQuality: getLineupTeamQualityRawAdjustment(lineup),
  lowScoringPenalty: getLowScoringLineupPenalty(lineup),
  primaryScorerPenalty: getPrimaryScorerLineupPenalty(lineup),
  offenseFloorPenalty: getLineupOffenseFloorPenalty(lineup),
  noStarPenalty: getNoTrueStarLineupPenalty(lineup),
  midTierImpactPenalty: getMidTierImpactLineupPenalty(lineup),
  eliteOffenseBonus: eliteFromRounded,
  superstarStackBonus: getSuperstarStackingLineupBonus(lineup),
};

const statRawTotal = score.categories.reduce((s, c) => s + c.value, 0);

const pipeline = buildLineupScorePipeline(
  {
    categories: score.categories,
    strengths: score.strengths,
    warnings: score.warnings,
    statRawTotal,
    productionScore: productionRounded,
    totalPoints,
  },
  modifiers,
);

console.log("\n=== ELITE OFFENSE CHECK ===");
console.log({
  productionRounded,
  totalPoints,
  eliteFromFloor,
  eliteFromRounded,
  eliteFromCeil,
});

console.log("\n=== FLAGS ===");
console.log({
  hasPrimaryScorer: hasPrimaryScorer(lineup),
  hasLineupFirstOption: hasLineupFirstOption(lineup),
  hasStarScorer: hasStarScorer(lineup),
  hasStarTierPlayer: hasStarTierPlayer(lineup),
  bestImpactRank: getLineupBestImpactRank(lineup),
  totalPpg: lineup.reduce((s, p) => s + p.points, 0),
  maxPpg: Math.max(...lineup.map((p) => p.points)),
  starBonusTotal: getLineupStarBonus(lineup),
  impactDepthBonus: getImpactDepthLineupBonus(lineup),
  scrubPenalty: getScrubTierLineupPenalty(lineup),
  chemistryBonuses: getActiveChemistryBonuses(lineup),
});

console.log("\n=== CATEGORIES ===");
for (const c of score.categories) {
  console.log(`  ${c.label}: ${c.value} — ${c.note}`);
}

console.log("\n=== PIPELINE LAYERS ===");
for (const layer of pipeline.layers) {
  console.log(`  ${layer.id}: ${layer.value}`);
}
console.log({
  rawTotal: pipeline.rawTotal,
  preciseOvr: preciseLineupOvr(pipeline.rawTotal),
  displayOvr: score.total,
  preciseTotalFromScore: score.preciseTotal,
  projectedWinsFromOvrOnly: projectedWinsFromOvr(score.preciseTotal),
  projectedRecord: score.projectedRecord,
  ceiling: LINEUP_RAW_CEILING,
});

console.log("\n=== MODIFIERS DETAIL ===");
console.log(modifiers);

console.log("\n=== STRENGTHS / WARNINGS ===");
console.log("strengths:", score.strengths);
console.log("warnings:", score.warnings);

// Reference: OKC-ish or a strong balanced lineup from tests
const REF_NAMES = [
  "Shai Gilgeous-Alexander",
  "Jalen Williams",
  "Chet Holmgren",
  "Luguentz Dort",
  "Isaiah Hartenstein",
];
const ref = REF_NAMES.map(findByName).filter((p): p is Player => Boolean(p));
if (ref.length === 5) {
  const refScore = calculateLineupScore(ref);
  console.log("\n=== REFERENCE (OKC core) ===");
  console.log(
    ref.map((p) => p.name).join(", "),
    "→ OVR",
    refScore.total,
    refScore.preciseTotal.toFixed(2),
    refScore.projectedRecord.formatted,
  );
}

// Also compare vs replacing unranked with mid starters
const midRefNames = [
  "Kyrie Irving",
  "Jerami Grant",
  "Dillon Brooks",
  "Naz Reid",
  "Tobias Harris",
];
const mid = midRefNames.map(findByName).filter((p): p is Player => Boolean(p));
if (mid.length === 5) {
  const midScore = calculateLineupScore(mid);
  console.log("\n=== REFERENCE (Kyrie + mid veterans) ===");
  console.log(
    mid.map((p) => p.name).join(", "),
    "→ OVR",
    midScore.total,
    midScore.preciseTotal.toFixed(2),
    midScore.projectedRecord.formatted,
  );
}

