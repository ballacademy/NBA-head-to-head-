import type { LineupScoreBreakdown } from "../scoring";

export interface LineupScoreLayer {
  id: string;
  label: string;
  value: number;
}

export interface LineupScoreModifiers {
  tierAdjustment: number;
  impactBlend: number;
  chemistry: number;
  teamQuality: number;
  lowScoringPenalty: number;
  primaryScorerPenalty: number;
  offenseFloorPenalty: number;
  noStarPenalty: number;
  eliteOffenseBonus: number;
  superstarStackBonus: number;
}

export interface LineupScorePipelineResult {
  layers: LineupScoreLayer[];
  breakdown: LineupScoreBreakdown;
  modifiers: LineupScoreModifiers;
  rawTotal: number;
}

export const computeLineupScoreLayers = (
  breakdown: LineupScoreBreakdown,
  modifiers: LineupScoreModifiers,
): LineupScoreLayer[] => [
  { id: "baseStats", label: "Base stats", value: breakdown.statRawTotal },
  { id: "tierAdjustment", label: "Star & scrub tiers", value: modifiers.tierAdjustment },
  { id: "impactBlend", label: "Impact rank blend", value: modifiers.impactBlend },
  { id: "chemistry", label: "Chemistry", value: modifiers.chemistry },
  { id: "teamQuality", label: "Team record anchor", value: modifiers.teamQuality },
  {
    id: "lowScoringPenalty",
    label: "Low scoring penalty",
    value: modifiers.lowScoringPenalty,
  },
  {
    id: "primaryScorerPenalty",
    label: "Primary scorer penalty",
    value: modifiers.primaryScorerPenalty,
  },
  {
    id: "offenseFloorPenalty",
    label: "Offense floor penalty",
    value: modifiers.offenseFloorPenalty,
  },
  { id: "noStarPenalty", label: "No true star penalty", value: modifiers.noStarPenalty },
  {
    id: "eliteOffenseBonus",
    label: "Elite offense bonus",
    value: modifiers.eliteOffenseBonus,
  },
  {
    id: "superstarStackBonus",
    label: "Superstar stacking bonus",
    value: modifiers.superstarStackBonus,
  },
];

export const sumLineupScoreLayers = (layers: LineupScoreLayer[]) =>
  layers.reduce((sum, layer) => sum + layer.value, 0);

export const buildLineupScorePipeline = (
  breakdown: LineupScoreBreakdown,
  modifiers: LineupScoreModifiers,
): LineupScorePipelineResult => {
  const layers = computeLineupScoreLayers(breakdown, modifiers);

  return {
    layers,
    breakdown,
    modifiers,
    rawTotal: sumLineupScoreLayers(layers),
  };
};
