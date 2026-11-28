import {
  formatRosterStat,
  playerRowForSeason,
  rosterStatValue,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import type { ComposerStatsSample } from "./composerStatsSample";

export const stripStatCaption = (
  playerId: string | null | undefined,
  metric: EveryTeamStatMetric,
  season: string,
  sample: ComposerStatsSample = "regular",
) => {
  if (!playerId) {
    return "";
  }
  const player = playerRowForSeason(playerId, season, undefined, sample);
  if (rosterStatValue(player, metric) == null) {
    return "";
  }
  return formatRosterStat(player, metric);
};
