export type MatchModeTheme =
  | "head-to-head"
  | "daily"
  | "ranked"
  | "all-time"
  | "practice";

export const getMatchModeTheme = (options: {
  isDailyDraft?: boolean;
  salaryCapMode?: boolean;
  allTimeMode?: boolean;
  practiceMode?: boolean;
}): MatchModeTheme => {
  if (options.practiceMode) {
    return "practice";
  }

  if (options.isDailyDraft) {
    return "daily";
  }

  if (options.allTimeMode) {
    return "all-time";
  }

  if (options.salaryCapMode) {
    return "ranked";
  }

  return "head-to-head";
};

export const matchModeThemeClass = (theme: MatchModeTheme) =>
  `mode-theme mode-theme--${theme}`;
