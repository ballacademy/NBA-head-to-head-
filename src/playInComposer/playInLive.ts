import { resolveTeamId } from "../playerOfTheDayComposer/lastGame";
import {
  ESPN_SCOREBOARD_URL,
  type EspnScoreboardPayload,
} from "../playerOfTheDayComposer/nightStandouts";
import {
  emptyPlayInScores,
  seedIndex,
  type PlayInDraft,
  type PlayInGameScores,
  type PlayInSize,
} from "./playInState";

export interface PlayInLiveGame {
  homeId: string;
  awayId: string;
  homeScore: string;
  awayScore: string;
  completed: boolean;
  inProgress: boolean;
}

const scoreOf = (
  item:
    | { score?: string | { displayValue?: string } }
    | undefined,
) => {
  if (!item?.score) {
    return "";
  }
  if (typeof item.score === "string") {
    return item.score;
  }
  return String(item.score.displayValue ?? "");
};

export const parsePlayInScoreboard = (
  payload: EspnScoreboardPayload,
): PlayInLiveGame[] => {
  const rows: PlayInLiveGame[] = [];
  for (const event of payload.events ?? []) {
    const competition = event.competitions?.[0];
    const comps = competition?.competitors ?? [];
    if (comps.length < 2) {
      continue;
    }
    const home =
      comps.find((item) => item.homeAway === "home") ?? comps[0];
    const away =
      comps.find((item) => item.homeAway === "away") ?? comps[1];
    const homeId = resolveTeamId(
      home?.team?.abbreviation,
      home?.team?.displayName,
    );
    const awayId = resolveTeamId(
      away?.team?.abbreviation,
      away?.team?.displayName,
    );
    if (!homeId || !awayId) {
      continue;
    }
    const state =
      event.status?.type?.state ??
      competition?.status?.type?.state ??
      "";
    rows.push({
      homeId,
      awayId,
      homeScore: scoreOf(home),
      awayScore: scoreOf(away),
      completed:
        event.status?.type?.completed === true || state === "post",
      inProgress: state === "in",
    });
  }
  return rows;
};

const pairScores = (
  left: string | null,
  right: string | null,
  games: PlayInLiveGame[],
): [string, string] => {
  if (!left || !right) {
    return ["", ""];
  }
  const game = games.find((row) => {
    const ids = new Set([row.homeId, row.awayId]);
    return ids.has(left) && ids.has(right);
  });
  if (!game) {
    return ["", ""];
  }
  const scoreFor = (id: string) =>
    id === game.homeId ? game.homeScore : game.awayScore;
  return [scoreFor(left), scoreFor(right)];
};

export const scoresFromLiveGames = (
  ids: Array<string | null>,
  size: PlayInSize,
  games: PlayInLiveGame[],
): PlayInGameScores => {
  const seven = seedIndex(size, 7);
  const eight = seedIndex(size, 8);
  const nine = seedIndex(size, 9);
  const ten = seedIndex(size, 10);
  return {
    sevenEight: pairScores(ids[seven] ?? null, ids[eight] ?? null, games),
    nineTen: pairScores(ids[nine] ?? null, ids[ten] ?? null, games),
  };
};

const mergeScores = (
  current: PlayInGameScores | undefined,
  live: PlayInGameScores,
): PlayInGameScores => {
  const empty = emptyPlayInScores();
  const prev = current ?? empty;
  const take = (
    game: "sevenEight" | "nineTen",
  ): [string, string] => {
    const next = live[game];
    if (next[0] || next[1]) {
      return next;
    }
    return prev[game];
  };
  return {
    sevenEight: take("sevenEight"),
    nineTen: take("nineTen"),
  };
};

export const applyLivePlayInScores = (
  draft: PlayInDraft,
  games: PlayInLiveGame[],
): PlayInDraft => ({
  ...draft,
  eastScores: mergeScores(
    draft.eastScores,
    scoresFromLiveGames(draft.east, draft.size, games),
  ),
  westScores: mergeScores(
    draft.westScores,
    scoresFromLiveGames(draft.west, draft.size, games),
  ),
});

export const fetchPlayInLiveGames = async (
  iso: string,
): Promise<PlayInLiveGame[]> => {
  try {
    const response = await fetch(ESPN_SCOREBOARD_URL(iso), {
      mode: "cors",
      credentials: "omit",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as EspnScoreboardPayload;
    return parsePlayInScoreboard(payload);
  } catch {
    return [];
  }
};
