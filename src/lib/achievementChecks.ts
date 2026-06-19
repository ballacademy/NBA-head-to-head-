import { getDivisionForTeam } from "./divisions";
import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "./allStars";
import { isScrubPlayer, isSuperScrubPlayer } from "./playerTiers";
import {
  hasStarPedigree,
  isAllStarTierPlayer,
  isSuperstarTierPlayer,
} from "./starPedigree";
import { meetsMinimumDefenseGrade } from "./defenseGrade";
import { hasLimitedSampleSize } from "./sampleSize";
import type { Player } from "./types";

const average = (values: number[]) =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const hasBbrIds = (lineup: Player[], ids: string[]) => {
  const bbrIds = new Set(
    lineup.map((player) => player.bbrPlayerId).filter(Boolean),
  );

  return ids.every((id) => bbrIds.has(id));
};

const countBbrPrefix = (lineup: Player[], prefix: string) =>
  lineup.filter((player) => player.bbrPlayerId?.startsWith(prefix)).length;

const includesBbr = (lineup: Player[], id: string) =>
  lineup.some((player) => player.bbrPlayerId === id);

const allSameTeam = (lineup: Player[]) => {
  const teams = new Set(lineup.map((player) => player.team));
  return teams.size === 1;
};

const allUniqueTeams = (lineup: Player[]) => {
  const teams = new Set(lineup.map((player) => player.team));
  return teams.size === lineup.length;
};

const allSameDivision = (lineup: Player[], division: string) =>
  lineup.every((player) => getDivisionForTeam(player.team) === division);

const primaryPositions = (lineup: Player[]) =>
  lineup.map((player) => player.position);

export interface AchievementCheckDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  check: (lineup: Player[]) => boolean;
}

export const ACHIEVEMENT_CHECKS: AchievementCheckDefinition[] = [
  {
    id: "oops-all-centers",
    title: "Oops, All Centers",
    description: "Draft a lineup of five bigs.",
    emoji: "🏗️",
    check: (lineup) =>
      lineup.every(
        (player) => player.position === "PF" || player.position === "C",
      ),
  },
  {
    id: "oops-all-guards",
    title: "Oops, All Guards",
    description: "Draft five point guards or shooting guards.",
    emoji: "🧃",
    check: (lineup) =>
      lineup.every(
        (player) => player.position === "PG" || player.position === "SG",
      ),
  },
  {
    id: "oops-all-forwards",
    title: "Oops, All Forwards",
    description: "Draft five small forwards or power forwards.",
    emoji: "↔️",
    check: (lineup) =>
      lineup.every(
        (player) => player.position === "SF" || player.position === "PF",
      ),
  },
  {
    id: "position-perfect",
    title: "Position Perfect",
    description: "Draft exactly one of each position.",
    emoji: "🧩",
    check: (lineup) => {
      const positions = new Set(primaryPositions(lineup));
      return positions.size === 5 && ["PG", "SG", "SF", "PF", "C"].every((pos) =>
        positions.has(pos as Player["position"]),
      );
    },
  },
  {
    id: "zero-big",
    title: "No Bigs Allowed",
    description: "Draft a lineup with no power forwards or centers.",
    emoji: "🐜",
    check: (lineup) =>
      lineup.every(
        (player) =>
          player.position === "PG" ||
          player.position === "SG" ||
          player.position === "SF",
      ),
  },
  {
    id: "twin-towers",
    title: "Twin Towers",
    description: "Draft at least two centers.",
    emoji: "🗼",
    check: (lineup) =>
      lineup.filter((player) => player.position === "C").length >= 2,
  },
  {
    id: "retirement-home",
    title: "The Retirement Home",
    description: "Draft a lineup with an average age over 35.",
    emoji: "🧓",
    check: (lineup) => {
      const ages = lineup
        .map((player) => player.age)
        .filter((age): age is number => typeof age === "number");

      return ages.length === 5 && average(ages) > 35;
    },
  },
  {
    id: "daycare",
    title: "Daycare",
    description: "Draft a lineup with an average age under 23.",
    emoji: "🍼",
    check: (lineup) => {
      const ages = lineup
        .map((player) => player.age)
        .filter((age): age is number => typeof age === "number");

      return ages.length === 5 && average(ages) < 23;
    },
  },
  {
    id: "brick-city",
    title: "Brick City",
    description: "Draft a lineup with brutal three-point shooting.",
    emoji: "🧱",
    check: (lineup) => {
      const avgThreePoint = average(lineup.map((player) => player.threePoint));
      const shooters = lineup.filter((player) => player.threePoint >= 0.34)
        .length;

      return avgThreePoint < 0.33 && shooters <= 1;
    },
  },
  {
    id: "splash-corps",
    title: "Splash Corps",
    description: "Draft five players shooting at least 37% from three.",
    emoji: "💦",
    check: (lineup) => lineup.every((player) => player.threePoint >= 0.37),
  },
  {
    id: "midrange-museum",
    title: "Midrange Museum",
    description: "Draft five players shooting below 32% from three.",
    emoji: "🖼️",
    check: (lineup) => lineup.every((player) => player.threePoint < 0.32),
  },
  {
    id: "sniper-team",
    title: "Sniper Team",
    description: "Draft a lineup averaging over 41% from three.",
    emoji: "🎯",
    check: (lineup) => average(lineup.map((player) => player.threePoint)) > 0.41,
  },
  {
    id: "nepotism",
    title: "Nepotism",
    description: "Draft Bronny James and Thanasis Antetokounmpo together.",
    emoji: "👨‍👩‍👦",
    check: (lineup) => hasBbrIds(lineup, ["jamesbr02", "antetth01"]),
  },
  {
    id: "alphabet-bros",
    title: "Alphabet Bros",
    description: "Draft two or more Antetokounmpo brothers.",
    emoji: "🇬🇷",
    check: (lineup) => countBbrPrefix(lineup, "antet") >= 2,
  },
  {
    id: "curry-kitchen",
    title: "Curry Kitchen",
    description: "Draft Stephen Curry and Seth Curry together.",
    emoji: "🍛",
    check: (lineup) => hasBbrIds(lineup, ["curryst01", "curryse01"]),
  },
  {
    id: "holiday-hoopers",
    title: "Holiday Hoopers",
    description: "Draft Jrue Holiday and Aaron Holiday together.",
    emoji: "🎄",
    check: (lineup) => hasBbrIds(lineup, ["holidjr01", "holidaa01"]),
  },
  {
    id: "small-ball",
    title: "Small Ball",
    description: "Draft a lineup averaging under 6'5\" in height.",
    emoji: "📏",
    check: (lineup) =>
      average(lineup.map((player) => player.heightInches)) < 76.5,
  },
  {
    id: "tall-tees",
    title: "Tall Tees",
    description: "Draft a lineup averaging over 6'10\" in height.",
    emoji: "🦒",
    check: (lineup) => average(lineup.map((player) => player.heightInches)) > 82,
  },
  {
    id: "turnover-terror",
    title: "Turnover Terror",
    description: "Draft a lineup averaging 3.6+ turnovers.",
    emoji: "🎭",
    check: (lineup) => average(lineup.map((player) => player.turnovers)) >= 3.6,
  },
  {
    id: "carebear-offense",
    title: "Carebear Offense",
    description: "Draft five players with 1.5 or fewer turnovers each.",
    emoji: "🧸",
    check: (lineup) => lineup.every((player) => player.turnovers <= 1.5),
  },
  {
    id: "usage-vampire",
    title: "Usage Vampire",
    description: "Draft five players with 26%+ usage.",
    emoji: "🩸",
    check: (lineup) => lineup.every((player) => player.usage >= 26),
  },
  {
    id: "glue-guys",
    title: "Glue Guys",
    description: "Draft five players with under 20% usage.",
    emoji: "🧴",
    check: (lineup) => lineup.every((player) => player.usage < 20),
  },
  {
    id: "block-party",
    title: "Block Party",
    description: "Draft five players with at least 1.0 blocks each.",
    emoji: "🚫",
    check: (lineup) => lineup.every((player) => player.blocks >= 1.0),
  },
  {
    id: "steal-city",
    title: "Steal City",
    description: "Draft five players with at least 1.2 steals each.",
    emoji: "🕵️",
    check: (lineup) => lineup.every((player) => player.steals >= 1.2),
  },
  {
    id: "stocks-and-bonds",
    title: "Stocks & Bonds",
    description:
      "Draft five players with at least 2.4 stocks (steals + blocks) each.",
    emoji: "📈",
    check: (lineup) =>
      lineup.every((player) => player.steals + player.blocks >= 2.4),
  },
  {
    id: "defensive-fortress",
    title: "Defensive Fortress",
    description: "Draft five players graded B+ or better on defense.",
    emoji: "🏰",
    check: (lineup) =>
      lineup.every((player) =>
        meetsMinimumDefenseGrade(player.defense, player.defenseGrade, "B+"),
      ),
  },
  {
    id: "matador",
    title: "Matador Defense",
    description: "Draft five players rated 5.5 or below on defense.",
    emoji: "🐂",
    check: (lineup) => lineup.every((player) => player.defense <= 5.5),
  },
  {
    id: "free-agents",
    title: "Free Agents",
    description: "Draft five players from five different teams.",
    emoji: "🏝️",
    check: allUniqueTeams,
  },
  {
    id: "same-jersey-club",
    title: "Same Jersey Club",
    description: "Draft five players from the same team.",
    emoji: "👕",
    check: allSameTeam,
  },
  {
    id: "pacific-pact",
    title: "Pacific Pact",
    description: "Draft five players from the Pacific Division.",
    emoji: "🌊",
    check: (lineup) => allSameDivision(lineup, "Pacific"),
  },
  {
    id: "five-superstars",
    title: "Galaxy Brain",
    description: "Draft five superstars.",
    emoji: "🌌",
    check: (lineup) => lineup.every((player) => isSuperstarTierPlayer(player)),
  },
  {
    id: "all-star-weekend",
    title: "All-Star Weekend",
    description: "Draft five current All-Stars.",
    emoji: "⭐️",
    check: (lineup) => lineup.every((player) => isAllStarTierPlayer(player)),
  },
  {
    id: "recent-heat",
    title: "Recent Heat",
    description: "Draft five recent All-Stars.",
    emoji: "🔥",
    check: (lineup) => lineup.every((player) => isRecentAllStarPlayer(player)),
  },
  {
    id: "scrub-life",
    title: "Scrub Life",
    description: "Draft five players from the scrub pool.",
    emoji: "🧹",
    check: (lineup) => lineup.every((player) => isScrubPlayer(player)),
  },
  {
    id: "gutter-gang",
    title: "Gutter Gang",
    description: "Draft five super scrubs.",
    emoji: "🕳️",
    check: (lineup) => lineup.every((player) => isSuperScrubPlayer(player)),
  },
  {
    id: "no-votes",
    title: "No Votes",
    description: "Draft five players with zero star pedigree.",
    emoji: "🗳️",
    check: (lineup) => lineup.every((player) => !hasStarPedigree(player)),
  },
  {
    id: "sample-size-syndrome",
    title: "Sample Size Syndrome",
    description: "Draft five limited-sample players.",
    emoji: "🔬",
    check: (lineup) => lineup.every((player) => hasLimitedSampleSize(player)),
  },
  {
    id: "iron-men",
    title: "Iron Men",
    description: "Draft five players with at least 75 games played.",
    emoji: "⛓️",
    check: (lineup) => lineup.every((player) => player.gamesPlayed >= 75),
  },
  {
    id: "bench-riders",
    title: "Bench Riders",
    description: "Draft a lineup averaging under 22 minutes.",
    emoji: "🪑",
    check: (lineup) => average(lineup.map((player) => player.minutes)) < 22,
  },
  {
    id: "workhorses",
    title: "Workhorses",
    description: "Draft five players averaging at least 37 minutes each.",
    emoji: "🐴",
    check: (lineup) => lineup.every((player) => player.minutes >= 37),
  },
  {
    id: "true-god",
    title: "True God",
    description: "Draft five players shooting at least 60% true shooting.",
    emoji: "✨",
    check: (lineup) => lineup.every((player) => player.trueShooting >= 0.6),
  },
  {
    id: "inefficient-inc",
    title: "Inefficient Inc.",
    description: "Draft five players shooting below 54% true shooting.",
    emoji: "📉",
    check: (lineup) => lineup.every((player) => player.trueShooting < 0.54),
  },
  {
    id: "scoring-title",
    title: "Scoring Title",
    description: "Draft a lineup averaging over 28 points.",
    emoji: "🏆",
    check: (lineup) => average(lineup.map((player) => player.points)) > 28,
  },
  {
    id: "poverty-line",
    title: "Poverty Line",
    description: "Draft five players averaging under 10 points each.",
    emoji: "💸",
    check: (lineup) => lineup.every((player) => player.points < 10),
  },
  {
    id: "assist-avalanche",
    title: "Assist Avalanche",
    description: "Draft a lineup averaging over 9 assists.",
    emoji: "🌨️",
    check: (lineup) => average(lineup.map((player) => player.assists)) > 9,
  },
  {
    id: "point-center",
    title: "Point Center",
    description: "Draft a center averaging 4+ assists.",
    emoji: "🪄",
    check: (lineup) =>
      lineup.some(
        (player) => player.position === "C" && player.assists >= 4,
      ),
  },
  {
    id: "engine-room",
    title: "Engine Room",
    description: "Draft five players with the engine play style.",
    emoji: "⚙️",
    check: (lineup) =>
      lineup.every((player) => player.styles.includes("engine")),
  },
  {
    id: "shooter-gallery",
    title: "Shooter Gallery",
    description: "Draft five players with the shooter play style.",
    emoji: "🔫",
    check: (lineup) =>
      lineup.every((player) => player.styles.includes("shooter")),
  },
  {
    id: "rim-runner-rodeo",
    title: "Rim Runner Rodeo",
    description: "Draft three players with the rim-protector play style.",
    emoji: "🤠",
    check: (lineup) =>
      lineup.filter((player) => player.styles.includes("rim-protector"))
        .length >= 3,
  },
  {
    id: "joker-wild",
    title: "Joker Wild",
    description: "Draft Nikola Jokić.",
    emoji: "🃏",
    check: (lineup) => includesBbr(lineup, "jokicni01"),
  },
  {
    id: "slim-reaper",
    title: "Slim Reaper",
    description: "Draft Kevin Durant.",
    emoji: "🦂",
    check: (lineup) => includesBbr(lineup, "duranke01"),
  },
];
