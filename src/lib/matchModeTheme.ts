export type MatchModeTheme = "head-to-head" | "daily" | "ranked" | "all-time";

export const getMatchModeTheme = (options: {
  isDailyDraft?: boolean;
  salaryCapMode?: boolean;
  allTimeMode?: boolean;
}): MatchModeTheme => {
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
