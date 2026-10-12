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
