import { isImpactRankElitePlayer } from "./impactRanking";
import { getPlayerLineupStarBonus } from "./lineupMatchupBonus";
import { getPlaymakerElevationStrength } from "./playmakerElevation";
import type { Player } from "./types";

export {
  getPlaymakerElevationStrength,
  isPlaymakerElevator,
  PLAYMAKER_ASSIST_SHARE_FLOOR,
  PLAYMAKER_ASSIST_SHARE_FULL,
  PLAYMAKER_ELEVATION_ASSISTS_FLOOR,
  PLAYMAKER_ELEVATION_ASSISTS_FULL,
} from "./playmakerElevation";

/** Extra tax when the only credited star does not create for teammates. */
export const SOLO_NON_PLAYMAKER_STAR_PENALTY = -4.5;

/** Players who currently receive star / elite-impact credit in the score. */
export const isStarCreditPlayer = (player: Player) =>
  getPlayerLineupStarBonus(player) > 0 || isImpactRankElitePlayer(player);

export const getLineupStarCreditPlayers = (lineup: Player[]) =>
  lineup.filter(isStarCreditPlayer);

/**
 * When a lineup leans on exactly one credited star, tax non-creators
 * (iso wings/guards and non-playmaking forwards/centers). Playmakers waive it.
 */
export const getSoloStarElevationPenalty = (lineup: Player[]) => {
  const starCredits = getLineupStarCreditPlayers(lineup);
  if (starCredits.length !== 1) {
    return 0;
  }

  const strength = getPlaymakerElevationStrength(starCredits[0]!);
  return SOLO_NON_PLAYMAKER_STAR_PENALTY * (1 - strength);
};
