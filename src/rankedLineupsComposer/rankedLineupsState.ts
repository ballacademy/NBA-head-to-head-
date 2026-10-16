import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { NBA_TEAMS } from "../standingsComposer/teams";
import {
  listRosterPlayers,
  rosterStatValue,
  type EveryTeamRosterPlayer,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import type { RankDisplay } from "./rankedLineupsLayout";
import {
  applyPlayerPick,
  clearStrip,
  createEmptyStrips,
  hasCustomPhoto,
  isTotwStrip,
  patchStrip,
  setStripPhoto,
  splitPlayerName,
  stripPlayerName,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";

export {
  applyPlayerPick,
  clearStrip,
  createEmptyStrips,
  DEFAULT_BRAND,
  hasCustomPhoto,
  patchStrip,
  setStripPhoto,
  splitPlayerName,
  stripPlayerName,
  type TotwStrip as RankedLineupStrip,
};

export const RANKED_LINEUP_STRIP_COUNT = 5;
export const LINEUP_POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;
export type LineupPosition = (typeof LINEUP_POSITIONS)[number];
export const DEFAULT_POSITION_LABELS = [...LINEUP_POSITIONS];
export const POSITION_LABEL_MAX = 8;

export const DEFAULT_RANKED_LINEUP_TITLE =
  "TOP 10 NBA PLAYERS AT EACH POSITION";
export const DEFAULT_LINEUP_TITLE = "STARTING LINEUP";
export const RANKED_LINEUP_TITLE_TRACK = 0.02;
export const DEFAULT_RANK_PILL = "BEST";
export const RANK_PILL_MAX = 12;
export const RANK_HEADLINE_TOTAL = 10;
export type { RankDisplay };
export const DEFAULT_RANK_DISPLAY: RankDisplay = "pill";

export const RANK_PILL_PRESETS = [
  "BEST",
  "2ND",
  "3RD",
  "4TH",
  "5TH",
  "6TH",
  "7TH",
  "8TH",
  "9TH",
  "10TH",
] as const;

export interface RankedLineupSlide {
  rank: string;
  strips: TotwStrip[];
}

export interface RankedLineupsDraft {
  brand: string;
  title: string;
  rank: string;
  strips: TotwStrip[];
  slides?: RankedLineupSlide[];
  activeSlide?: number;
  showBa?: boolean;
  showFade?: boolean;
  showTeamHairline?: boolean;
  rankDisplay?: RankDisplay;
  positionLabels?: string[];
  season?: string;
}

export const lineupPosition = (index: number): LineupPosition =>
  LINEUP_POSITIONS[index] ?? "PG";

export const splitRankedLineupTitle = (title: string): string[] =>
  splitBalancedTitle(
    title,
    DEFAULT_RANKED_LINEUP_TITLE,
    RANKED_LINEUP_TITLE_TRACK,
  );

export const isRankedLineupsDraft = (
  value: unknown,
): value is RankedLineupsDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as RankedLineupsDraft).brand === "string" &&
      typeof (value as RankedLineupsDraft).title === "string" &&
      typeof (value as RankedLineupsDraft).rank === "string" &&
      Array.isArray((value as RankedLineupsDraft).strips) &&
      (value as RankedLineupsDraft).strips.length ===
        RANKED_LINEUP_STRIP_COUNT &&
      (value as RankedLineupsDraft).strips.every(isTotwStrip),
  );

export const usedLineupPlayerIds = (strips: TotwStrip[]) => {
  const used: Record<string, string> = {};
  strips.forEach((strip, index) => {
    if (strip.playerId) {
      used[strip.playerId] = lineupPosition(index);
    }
  });
  return used;
};

export interface LineupStatLeaderPick {
  player: EveryTeamRosterPlayer;
  teamId: string;
  value: number;
}

export const lineupPositionMatches = (
  playerPosition: string,
  slot: LineupPosition,
  loose = false,
): boolean => {
  const pos = playerPosition.trim().toUpperCase();
  if (pos === slot) {
    return true;
  }
  if (!loose) {
    return false;
  }
  if (slot === "PG" || slot === "SG") {
    return pos === "G";
  }
  if (slot === "SF" || slot === "PF") {
    return pos === "F";
  }
  return false;
};

export const listLineupStatPool = (
  season: string,
  metric: EveryTeamStatMetric,
  sample: ComposerStatsSample = "regular",
): LineupStatLeaderPick[] => {
  const byId = new Map<string, LineupStatLeaderPick>();
  NBA_TEAMS.forEach((team) => {
    listRosterPlayers(team.id, season, sample).forEach((player) => {
      const value = rosterStatValue(player, metric);
      if (value == null) {
        return;
      }
      const previous = byId.get(player.id);
      if (
        !previous ||
        value > previous.value ||
        (value === previous.value && player.depth < previous.player.depth)
      ) {
        byId.set(player.id, { player, teamId: team.id, value });
      }
    });
  });
  return [...byId.values()];
};

const compareLineupLeaders = (
  left: LineupStatLeaderPick,
  right: LineupStatLeaderPick,
) =>
  right.value - left.value ||
  left.player.depth - right.player.depth ||
  left.player.name.localeCompare(right.player.name);

export const pickLineupStatLeaders = (
  season: string,
  metric: EveryTeamStatMetric,
  sample: ComposerStatsSample = "regular",
  rank = 1,
): Array<LineupStatLeaderPick | null> => {
  const pool = listLineupStatPool(season, metric, sample);
  const used = new Set<string>();
  const skipCount = Math.max(0, rank - 1);
  return LINEUP_POSITIONS.map((slot) => {
    const take = (loose: boolean) => {
      const ranked = pool
        .filter((row) =>
          lineupPositionMatches(row.player.position, slot, loose),
        )
        .sort(compareLineupLeaders);
      let skipped = 0;
      for (const row of ranked) {
        if (used.has(row.player.id)) {
          continue;
        }
        if (skipped < skipCount) {
          skipped += 1;
          continue;
        }
        return row;
      }
      return null;
    };
    const pick = take(false) ?? take(true);
    if (pick) {
      used.add(pick.player.id);
    }
    return pick;
  });
};

export const fillLineupByStatLeaders = (
  strips: TotwStrip[],
  season: string,
  metric: EveryTeamStatMetric,
  sample: ComposerStatsSample = "regular",
  rank = 1,
): { strips: TotwStrip[]; filled: number } => {
  const leaders = pickLineupStatLeaders(season, metric, sample, rank);
  let next = strips.slice();
  let filled = 0;
  leaders.forEach((leader, index) => {
    if (!leader) {
      return;
    }
    next = applyPlayerPick(
      next,
      index,
      {
        id: leader.player.id,
        name: leader.player.name,
        team: leader.teamId,
        headshotUrl: leader.player.headshotUrl,
      },
      hasCustomPhoto(next[index]!),
    );
    filled += 1;
  });
  return { strips: next, filled };
};

export const defaultRankedLineupsDraft = (): RankedLineupsDraft => {
  const slide = emptyLineupSlide();
  return {
    brand: DEFAULT_BRAND,
    title: DEFAULT_RANKED_LINEUP_TITLE,
    rank: slide.rank,
    strips: slide.strips,
    slides: [slide],
    activeSlide: 0,
    showBa: false,
    showFade: false,
    showTeamHairline: true,
    rankDisplay: DEFAULT_RANK_DISPLAY,
    positionLabels: [...DEFAULT_POSITION_LABELS],
  };
};

export const parsePositionLabels = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length !== RANKED_LINEUP_STRIP_COUNT) {
    return [...DEFAULT_POSITION_LABELS];
  }
  return value.map((item, index) => {
    if (typeof item !== "string") {
      return DEFAULT_POSITION_LABELS[index]!;
    }
    return item.replace(/\s+/g, " ").trim().slice(0, POSITION_LABEL_MAX);
  });
};

export const positionLabelAt = (labels: string[] | undefined, index: number) =>
  parsePositionLabels(labels)[index] ?? "";

export const parseRankDisplay = (
  value: unknown,
  fallback: RankDisplay = "pill",
): RankDisplay => {
  if (value === "headline" || value === "pill" || value === "none") {
    return value;
  }
  return fallback;
};

export const rankOrdinalNumber = (rank: string) => {
  const upper = rank.trim().toUpperCase() || DEFAULT_RANK_PILL;
  const preset = (RANK_PILL_PRESETS as readonly string[]).indexOf(upper);
  if (preset >= 0) {
    return preset + 1;
  }
  const digits = upper.match(/(\d+)/);
  if (digits) {
    return Number(digits[1]);
  }
  return 1;
};

export const rankHeadlinePrimary = (rank: string) =>
  `#${rankOrdinalNumber(rank)}`;

export const rankHeadlineSecondary = (
  rank: string,
  total = RANK_HEADLINE_TOTAL,
) => `${rankOrdinalNumber(rank)} OF ${total}`;

export const isRankedLineupSlide = (value: unknown): value is RankedLineupSlide =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as RankedLineupSlide).rank === "string" &&
      Array.isArray((value as RankedLineupSlide).strips) &&
      (value as RankedLineupSlide).strips.length === RANKED_LINEUP_STRIP_COUNT &&
      (value as RankedLineupSlide).strips.every(isTotwStrip),
  );

const ordinalPill = (value: number) => {
  const teen = value % 100;
  if (teen >= 11 && teen <= 13) {
    return `${value}TH`;
  }
  switch (value % 10) {
    case 1:
      return `${value}ST`;
    case 2:
      return `${value}ND`;
    case 3:
      return `${value}RD`;
    default:
      return `${value}TH`;
  }
};

export const nextRankPill = (rank: string) => {
  const upper = rank.trim().toUpperCase() || DEFAULT_RANK_PILL;
  const preset = (RANK_PILL_PRESETS as readonly string[]).indexOf(upper);
  if (preset >= 0 && preset < RANK_PILL_PRESETS.length - 1) {
    return RANK_PILL_PRESETS[preset + 1]!;
  }
  const digits = upper.match(/^(\d+)/);
  if (digits) {
    return ordinalPill(Number(digits[1]) + 1);
  }
  return "2ND";
};

export const swipeRankCue = (rank: string) => {
  const current = rank.trim().toUpperCase() || DEFAULT_RANK_PILL;
  return `${current} → ${nextRankPill(current)}`;
};

export const emptyLineupSlide = (rank = DEFAULT_RANK_PILL): RankedLineupSlide => ({
  rank,
  strips: createEmptyStrips(),
});

export const slidesFromDraft = (
  draft: Pick<RankedLineupsDraft, "rank" | "strips" | "slides">,
): RankedLineupSlide[] => {
  if (Array.isArray(draft.slides) && draft.slides.length > 0 && draft.slides.every(isRankedLineupSlide)) {
    return draft.slides;
  }
  return [{ rank: draft.rank, strips: draft.strips }];
};

export const clampActiveSlide = (slides: RankedLineupSlide[], index: number) =>
  Math.max(0, Math.min(slides.length - 1, index));

export const withActiveSlide = (
  draft: RankedLineupsDraft,
  slides: RankedLineupSlide[],
  activeSlide: number,
): RankedLineupsDraft => {
  const index = clampActiveSlide(slides, activeSlide);
  const slide = slides[index] ?? emptyLineupSlide(draft.rank);
  return {
    ...draft,
    slides,
    activeSlide: index,
    rank: slide.rank,
    strips: slide.strips,
  };
};
