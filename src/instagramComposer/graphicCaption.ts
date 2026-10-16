export const COMPOSER_HASHTAGS = "#NBA #BallAcademy";
export const COMPOSER_FIRST_COMMENT_PROMPT =
  "Who you got? Drop it in the first comment.";

export const stripCaptionName = (strip: {
  firstName?: string;
  lastName?: string;
}) =>
  `${strip.firstName ?? ""} ${strip.lastName ?? ""}`
    .replace(/\s+/g, " ")
    .trim();

export const graphicCaption = (
  title: string,
  names: string[],
  extra: string[] = [],
) =>
  [
    title.trim(),
    ...extra.map((line) => line.trim()).filter(Boolean),
    ...names,
    COMPOSER_HASHTAGS,
    COMPOSER_FIRST_COMMENT_PROMPT,
  ]
    .filter(Boolean)
    .join("\n");

export const everyTeamCaption = (title: string, names: string[]) =>
  graphicCaption(title, names);

export const tierListCaption = (
  title: string,
  rows: Array<{ label: string; names: string[] }>,
) =>
  graphicCaption(
    title,
    [],
    rows.map((row) => {
      const names = row.names.filter(Boolean);
      return names.length ? `${row.label}: ${names.join(", ")}` : "";
    }),
  );

const lineValue = (
  stats: Array<{ key: string; value: string }>,
  key: string,
) => stats.find((line) => line.key === key)?.value.trim() ?? "";

/** Caption from the on-card line: full name, PTS/REB/AST, and W/L. */
export const statCardLineCaption = (draft: {
  firstName?: string;
  lastName?: string;
  gameDate?: string | null;
  matchup?: string;
  showMatchup?: boolean;
  stats: Array<{ key: string; value: string }>;
}) => {
  const name = stripCaptionName(draft) || "Stat card";
  const pts = lineValue(draft.stats, "pts");
  const reb = lineValue(draft.stats, "reb");
  const ast = lineValue(draft.stats, "ast");
  const min = lineValue(draft.stats, "min");
  const parts = [pts, reb, ast].filter(Boolean);
  const line = parts.length
    ? `${parts.join("/")}${min ? ` in ${min} min` : ""}`
    : "";
  const matchup = (draft.matchup ?? "").trim();
  const date = (draft.gameDate ?? "").trim();
  return graphicCaption(name, [], [line, matchup, matchup ? "" : date]);
};

export const rankedLineupCaption = (
  title: string,
  rank: string,
  strips: Array<{ firstName?: string; lastName?: string }>,
) =>
  graphicCaption(
    title,
    strips.map(stripCaptionName).filter(Boolean),
    [rank],
  );

export const copyGraphicCaption = async (text: string) => {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard is not available");
  }
  await navigator.clipboard.writeText(text);
  return text;
};
