import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  emptyStats,
  formatDateLabel,
  formatResultLine,
  isoDateOnly,
  resolveTeamId,
  toEspnDateParam,
  type LastGame,
  type LastGameStats,
} from "./lastGame";

export const ESPN_SCOREBOARD_URL = (iso: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${toEspnDateParam(iso)}`;

export const ESPN_SUMMARY_URL = (eventId: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(eventId)}`;

export interface NightStandout {
  athleteId: string;
  name: string;
  teamId: string;
  badge: string;
  flags: string[];
  line: string;
  score: number;
  game: LastGame;
}

interface EspnCompetitor {
  score?: string | { displayValue?: string };
  winner?: boolean;
  homeAway?: string;
  team?: { abbreviation?: string; displayName?: string; id?: string };
}

interface EspnScoreboardEvent {
  id?: string;
  date?: string;
  status?: { type?: { completed?: boolean; state?: string; description?: string } };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: { type?: { completed?: boolean; state?: string } };
  }>;
}

export interface EspnScoreboardPayload {
  events?: EspnScoreboardEvent[];
}

interface EspnBoxAthlete {
  athlete?: { id?: string; displayName?: string };
  stats?: string[];
}

interface EspnBoxTeam {
  team?: { abbreviation?: string; displayName?: string };
  statistics?: Array<{
    keys?: string[];
    labels?: string[];
    athletes?: EspnBoxAthlete[];
  }>;
}

export interface EspnSummaryPayload {
  boxscore?: { players?: EspnBoxTeam[] };
  header?: {
    competitions?: Array<{
      competitors?: EspnCompetitor[];
      date?: string;
    }>;
  };
}

const BOX_KEY: Record<string, keyof LastGameStats> = {
  minutes: "min",
  MIN: "min",
  points: "pts",
  PTS: "pts",
  rebounds: "reb",
  REB: "reb",
  assists: "ast",
  AST: "ast",
  steals: "stl",
  STL: "stl",
  blocks: "blk",
  BLK: "blk",
  turnovers: "tov",
  TO: "tov",
  "fieldGoalsMade-fieldGoalsAttempted": "fg",
  FG: "fg",
  "threePointFieldGoalsMade-threePointFieldGoalsAttempted": "three",
  "3PT": "three",
};

const n = (value: string) => {
  const parsed = Number.parseFloat(String(value).split("-")[0] ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};

const competitorScore = (item: EspnCompetitor | undefined) => {
  if (!item) {
    return "";
  }
  if (typeof item.score === "string") {
    return item.score;
  }
  return String(item.score?.displayValue ?? "");
};

export const statsFromBoxRow = (
  keys: string[],
  values: string[],
): LastGameStats => {
  const stats = emptyStats();
  keys.forEach((key, index) => {
    const field = BOX_KEY[key] ?? BOX_KEY[key.toUpperCase()];
    const value = values[index];
    if (field && value) {
      stats[field] = value;
    }
  });
  return stats;
};

export const nightFlagsFor = (stats: LastGameStats) => {
  const pts = n(stats.pts);
  const reb = n(stats.reb);
  const ast = n(stats.ast);
  const stl = n(stats.stl);
  const blk = n(stats.blk);
  const stocks = stl + blk;
  const pra = pts + reb + ast;
  const tens = [pts, reb, ast, stl, blk].filter((value) => value >= 10).length;
  const flags: string[] = [];
  if (tens >= 3) {
    flags.push("Triple-double");
  } else if (tens >= 2) {
    flags.push("Double-double");
  }
  if (pts >= 40) {
    flags.push("40+ PTS");
  } else if (pts >= 30) {
    flags.push("30+ PTS");
  }
  if (stocks >= 5) {
    flags.push("Big stocks");
  } else if (blk >= 4) {
    flags.push("Blocks");
  } else if (stl >= 4) {
    flags.push("Steals");
  }
  if (pra >= 35 && tens < 3) {
    flags.push("High PRA");
  }
  return {
    pts,
    reb,
    ast,
    stl,
    blk,
    stocks,
    pra,
    tens,
    flags,
    score: pts + pra * 0.35 + stocks * 5 + tens * 18,
  };
};

const standoutLine = (
  stats: LastGameStats,
  extra: ReturnType<typeof nightFlagsFor>,
) => {
  const bits = [
    `${stats.pts} PTS`,
    `${stats.reb} REB`,
    `${stats.ast} AST`,
  ];
  if (extra.stocks >= 3) {
    bits.push(`${stats.stl} STL`, `${stats.blk} BLK`);
  }
  return bits.join(" · ");
};

export const rankNightStandouts = (rows: NightStandout[]) => {
  const played = rows.filter((row) => n(row.game.stats.min) > 0);
  const pick = (
    value: (row: NightStandout) => number,
    count: number,
    floor: number,
  ) =>
    [...played]
      .sort((left, right) => value(right) - value(left))
      .filter((row) => value(row) >= floor)
      .slice(0, count);
  const byPts = pick((row) => n(row.game.stats.pts), 5, 18);
  const byPra = pick(
    (row) =>
      n(row.game.stats.pts) + n(row.game.stats.reb) + n(row.game.stats.ast),
    5,
    25,
  );
  const byBlk = pick((row) => n(row.game.stats.blk), 4, 2);
  const byStl = pick((row) => n(row.game.stats.stl), 4, 2);
  const byStocks = pick(
    (row) => n(row.game.stats.stl) + n(row.game.stats.blk),
    4,
    3,
  );
  const flagged = played.filter((row) => row.flags.length > 0);
  const seen = new Set<string>();
  const merged: NightStandout[] = [];
  for (const row of [
    ...flagged,
    ...byPts,
    ...byPra,
    ...byBlk,
    ...byStl,
    ...byStocks,
  ]) {
    if (seen.has(row.athleteId)) {
      continue;
    }
    seen.add(row.athleteId);
    merged.push(row);
  }
  return merged.sort((a, b) => b.score - a.score).slice(0, 12);
};

const eventIsPlayed = (event: EspnScoreboardEvent) => {
  const state =
    event.status?.type?.state ??
    event.competitions?.[0]?.status?.type?.state ??
    "";
  if (state === "pre") {
    return false;
  }
  return (
    event.status?.type?.completed === true ||
    state === "in" ||
    state === "post"
  );
};

export const nightStandoutFromBox = (
  athleteId: string,
  name: string,
  teamId: string,
  opponent: { id: string; abbrev: string; score: string },
  ours: { score: string; winner?: boolean },
  eventId: string,
  gameDate: string,
  stats: LastGameStats,
): NightStandout | null => {
  if (!athleteId || n(stats.min) <= 0) {
    return null;
  }
  const extra = nightFlagsFor(stats);
  const result = ours.winner ? "W" : "L";
  return {
    athleteId,
    name,
    teamId,
    badge: extra.flags[0] ?? (extra.pts >= 20 ? "Points" : "Standout"),
    flags: extra.flags,
    line: standoutLine(stats, extra),
    score: extra.score,
    game: {
      eventId,
      gameDate,
      teamId,
      opponentId: opponent.id,
      opponentAbbrev: opponent.abbrev,
      result,
      playerScore: ours.score,
      opponentScore: opponent.score,
      resultLine: formatResultLine(
        ours.score,
        opponent.score,
        result,
        opponent.abbrev,
      ),
      dateLabel: formatDateLabel(gameDate),
      stats,
    },
  };
};

export const parseSummaryStandouts = (
  payload: EspnSummaryPayload | null | undefined,
  eventId: string,
  gameDate: string,
): NightStandout[] => {
  const rows: NightStandout[] = [];
  const headerComps = payload?.header?.competitions?.[0]?.competitors ?? [];
  for (const side of payload?.boxscore?.players ?? []) {
    const teamId =
      resolveTeamId(side.team?.abbreviation, side.team?.displayName) ?? "";
    const ours = headerComps.find((item) => {
      const id = resolveTeamId(item.team?.abbreviation, item.team?.displayName);
      return id === teamId;
    });
    const opp = headerComps.find((item) => item !== ours);
    const opponentId =
      resolveTeamId(opp?.team?.abbreviation, opp?.team?.displayName) ?? "";
    const opponentAbbrev =
      opponentId || (opp?.team?.abbreviation ?? "OPP").toUpperCase();
    const group = side.statistics?.[0];
    const keys = group?.keys ?? group?.labels ?? [];
    for (const athlete of group?.athletes ?? []) {
      const id = String(athlete.athlete?.id ?? "");
      if (!getPlayer(id)) {
        continue;
      }
      const stats = statsFromBoxRow(keys, athlete.stats ?? []);
      const row = nightStandoutFromBox(
        id,
        athlete.athlete?.displayName ?? getPlayer(id)?.name ?? "",
        teamId,
        {
          id: opponentId,
          abbrev: opponentAbbrev,
          score: competitorScore(opp),
        },
        { score: competitorScore(ours), winner: ours?.winner },
        eventId,
        gameDate,
        stats,
      );
      if (row) {
        rows.push(row);
      }
    }
  }
  return rows;
};

const cache = new Map<string, NightStandout[]>();

export const fetchNightStandouts = async (
  iso: string,
): Promise<NightStandout[]> => {
  const date = isoDateOnly(iso);
  if (!date) {
    return [];
  }
  if (cache.has(date)) {
    return cache.get(date) ?? [];
  }
  try {
    const boardRes = await fetch(ESPN_SCOREBOARD_URL(date), {
      mode: "cors",
      credentials: "omit",
    });
    if (!boardRes.ok) {
      return [];
    }
    const board = (await boardRes.json()) as EspnScoreboardPayload;
    const events = (board.events ?? []).filter(eventIsPlayed);
    const batches = await Promise.all(
      events.map(async (event) => {
        const eventId = String(event.id ?? "");
        if (!eventId) {
          return [] as NightStandout[];
        }
        const response = await fetch(ESPN_SUMMARY_URL(eventId), {
          mode: "cors",
          credentials: "omit",
        });
        if (!response.ok) {
          return [] as NightStandout[];
        }
        const summary = (await response.json()) as EspnSummaryPayload;
        return parseSummaryStandouts(
          summary,
          eventId,
          isoDateOnly(event.date) || date,
        );
      }),
    );
    const ranked = rankNightStandouts(batches.flat());
    cache.set(date, ranked);
    return ranked;
  } catch {
    return [];
  }
};
