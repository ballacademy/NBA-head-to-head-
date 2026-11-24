import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { espnGamelogSeasonYear } from "../playerOfTheDayComposer/lastGame";
import type { LiveCountingStats } from "./historicalRosters";

const roundStat = (value: number) => Math.round(value * 10) / 10;

/** ESPN `seasontype`: 2 = regular season, 1 = preseason. */
export const ESPN_SEASON_TYPE = {
  regular: 2,
  preseason: 1,
} as const;

export const ESPN_SEASON_BY_ATHLETE_URL = (
  seasonYear: number,
  seasonType: number = ESPN_SEASON_TYPE.regular,
) =>
  `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?limit=400&season=${seasonYear}&seasontype=${seasonType}`;

interface EspnByAthleteCategoryMeta {
  name?: string;
  names?: string[];
}

interface EspnByAthleteCategoryValues {
  name?: string;
  values?: Array<number | string | null>;
}

export interface EspnByAthletePayload {
  categories?: EspnByAthleteCategoryMeta[];
  athletes?: Array<{
    athlete?: { id?: string | number };
    categories?: EspnByAthleteCategoryValues[];
  }>;
}

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** ESPN shooting rates are 0–100; roster rows store 0–1. */
export const espnRateToFraction = (value: number | null) => {
  if (value == null) {
    return null;
  }
  const rate = value > 1 ? value / 100 : value;
  return Math.round(rate * 1000) / 1000;
};

const zipCategory = (
  meta: EspnByAthleteCategoryMeta | undefined,
  row: EspnByAthleteCategoryValues | undefined,
) => {
  const names = meta?.names ?? [];
  const values = row?.values ?? [];
  const out: Record<string, number> = {};
  names.forEach((name, index) => {
    const parsed = toNumber(values[index]);
    if (name && parsed != null) {
      out[name] = parsed;
    }
  });
  return out;
};

const countingFromZipped = (
  zipped: Record<string, number>,
): LiveCountingStats | null => {
  const gp = toNumber(zipped.gamesPlayed);
  if (gp == null || gp <= 0) {
    return null;
  }
  return {
    gp: Math.round(gp),
    min: zipped.avgMinutes != null ? roundStat(zipped.avgMinutes) : null,
    pts: zipped.avgPoints != null ? roundStat(zipped.avgPoints) : null,
    reb: zipped.avgRebounds != null ? roundStat(zipped.avgRebounds) : null,
    ast: zipped.avgAssists != null ? roundStat(zipped.avgAssists) : null,
    stl: zipped.avgSteals != null ? roundStat(zipped.avgSteals) : null,
    blk: zipped.avgBlocks != null ? roundStat(zipped.avgBlocks) : null,
    tov: zipped.avgTurnovers != null ? roundStat(zipped.avgTurnovers) : null,
    fg3m:
      zipped.avgThreePointFieldGoalsMade != null
        ? roundStat(zipped.avgThreePointFieldGoalsMade)
        : null,
    fgPct: espnRateToFraction(toNumber(zipped.fieldGoalPct)),
    fg3Pct: espnRateToFraction(toNumber(zipped.threePointFieldGoalPct)),
    ftPct: espnRateToFraction(toNumber(zipped.freeThrowPct)),
  };
};

export const parseEspnSeasonAverages = (
  payload: EspnByAthletePayload,
): Map<string, LiveCountingStats> => {
  const metaByName = new Map(
    (payload.categories ?? [])
      .filter((category) => category.name)
      .map((category) => [category.name as string, category]),
  );
  const byId = new Map<string, LiveCountingStats>();
  for (const row of payload.athletes ?? []) {
    const id = String(row.athlete?.id ?? "").trim();
    if (!id) {
      continue;
    }
    const zipped: Record<string, number> = {};
    for (const category of row.categories ?? []) {
      Object.assign(
        zipped,
        zipCategory(metaByName.get(category.name ?? ""), category),
      );
    }
    const stats = countingFromZipped(zipped);
    if (stats) {
      byId.set(id, stats);
    }
  }
  return byId;
};

const cache = new Map<string, Map<string, LiveCountingStats>>();
const inflight = new Map<string, Promise<Map<string, LiveCountingStats>>>();

const cacheKey = (seasonYear: number, seasonType: number) =>
  `${seasonYear}:${seasonType}`;

export const resetEspnSeasonAveragesCache = () => {
  cache.clear();
  inflight.clear();
};

export const fetchEspnSeasonAverages = async (
  season: string,
  sample: ComposerStatsSample = "regular",
): Promise<Map<string, LiveCountingStats>> => {
  const seasonYear = espnGamelogSeasonYear(season);
  const seasonType =
    sample === "preseason"
      ? ESPN_SEASON_TYPE.preseason
      : ESPN_SEASON_TYPE.regular;
  const key = cacheKey(seasonYear, seasonType);
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }
  const request = (async () => {
    try {
      const response = await fetch(
        ESPN_SEASON_BY_ATHLETE_URL(seasonYear, seasonType),
        {
          mode: "cors",
          credentials: "omit",
        },
      );
      if (!response.ok) {
        return new Map<string, LiveCountingStats>();
      }
      const payload = (await response.json()) as EspnByAthletePayload;
      const parsed = parseEspnSeasonAverages(payload);
      if (parsed.size > 0) {
        cache.set(key, parsed);
      }
      return parsed;
    } catch {
      return new Map<string, LiveCountingStats>();
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, request);
  return request;
};
