export const STANDINGS_TITLE_PRESETS = [
  "PROJECTED NBA STANDINGS",
  "NBA POWER RANKINGS",
  "EASTERN CONFERENCE",
  "WESTERN CONFERENCE",
];

export const TIER_TITLE_PRESETS = [
  "GUESS THE NBA TIER LIST",
  "NBA PLAYER TIER LIST",
  "NBA TEAM TIER LIST",
];

export const EVERY_TEAM_TITLE_PRESETS = [
  "MOST DISAPPOINTING PLAYER ON EVERY NBA TEAM",
  "BEST PLAYER ON EVERY NBA TEAM",
  "MOST OVERRATED PLAYER ON EVERY NBA TEAM",
];

export const POTD_TITLE_PRESETS = [
  "PLAYER OF THE DAY?",
  "PLAY OF THE NIGHT",
  "STAT LINE OF THE NIGHT",
];

export const LEADERBOARD_TITLE_PRESETS = [
  "POTD LEADERBOARD",
  "PLAYER OF THE DAY LEADERBOARD",
  "POTD WINS",
];

export const TOTW_TITLE_PRESETS = [
  "TEAM OF THE WEEK",
  "EASTERN TEAM OF THE WEEK",
  "WESTERN TEAM OF THE WEEK",
  "ROOKIE TEAM OF THE WEEK",
];

export const TOTW_PLUS_STARTER_PRESETS = [
  "TEAM OF THE WEEK",
  "EASTERN TEAM OF THE WEEK",
  "WESTERN TEAM OF THE WEEK",
];

export const TOTW_PLUS_STANDOUT_PRESETS = [
  "STANDOUTS OF THE WEEK",
  "SIXTH MEN OF THE WEEK",
  "HONORABLE MENTIONS",
];

export const PYRAMID_TITLE_PRESETS = [
  "NBA COY PYRAMID",
  "NBA MVP PYRAMID",
  "NBA DPOY PYRAMID",
  "NBA MIP PYRAMID",
  "NBA 6MOY PYRAMID",
  "NBA ALL-NBA PYRAMID",
  "NBA ALL-DEFENSE PYRAMID",
  "NBA ROOKIE PYRAMID",
  "NBA PLAYER PYRAMID",
  "NBA COACH PYRAMID",
];

export const HEADLINE_TITLE_PRESETS = [
  "BREAKING",
  "TRADE RUMOR",
  "TRADE",
  "SIGNING",
  "WAIVED",
  "BOUGHT OUT",
  "EXTENSION",
  "RE-SIGNED",
  "BLOWN OUT",
  "CAREER NIGHT",
  "DEFENSIVE CLINIC",
  "OUT",
  "DOUBTFUL",
  "QUESTIONABLE",
  "REST",
  "GTD",
  "STATEMENT WIN",
  "MASSIVE LEAP",
  "HE’S HIM",
  "HOT TAKE",
  "UNLOCKED",
];

export const RANKED_LINEUP_TITLE_PRESETS = [
  "TOP 10 NBA PLAYERS AT EACH POSITION",
  "BEST NBA LINEUP AT EACH POSITION",
  "NBA ALL-DEFENSE AT EACH POSITION",
  "NBA ALL-ROOKIE AT EACH POSITION",
];

export const LINEUP_TITLE_PRESETS = [
  "STARTING LINEUP",
  "CLOSING LINEUP",
  "ALL-DEFENSE FIVE",
];

export const COMPARE_TITLE_PRESETS = [
  "NOT A SIXTH MAN",
  "THEN VS NOW",
  "STARTER VS BENCH",
];

export const QUOTE_TITLE_PRESETS = [
  "THEY SAID IT",
  "HOT TAKE",
];

export const PLAY_IN_TITLE_PRESETS = [
  "NBA PLAY-IN",
  "PLAY-IN TOURNAMENT",
];

export const MOCK_TRADE_TITLE_PRESETS = [
  "MOCK TRADE",
  "3-TEAM TRADE",
  "TRADE RUMOR",
  "BLOCKBUSTER",
];

export const slugifyExport = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const exportDateStamp = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

export const exportFilenameFromTitle = (
  title: string,
  fallback: string,
  date = "",
  story = false,
) => {
  const stem = slugifyExport(title) || fallback;
  const day = slugifyExport(date);
  const parts = [stem, day, story ? "story" : ""].filter(Boolean);
  return `${parts.join("-")}.png`;
};
