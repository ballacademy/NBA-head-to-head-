export const COMPOSER_HASHTAGS = "#NBA #BallAcademy";

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
  [title.trim(), ...extra.map((line) => line.trim()).filter(Boolean), ...names, COMPOSER_HASHTAGS]
    .filter(Boolean)
    .join("\n");

const lineValue = (
  stats: Array<{ key: string; value: string }>,
  key: string,
) => stats.find((line) => line.key === key)?.value.trim() ?? "";

/** Caption from the on-card line: `Giannis 20/15/9 in 24 min`. */
export const statCardLineCaption = (draft: {
  firstName?: string;
  lastName?: string;
  gameDate?: string | null;
  stats: Array<{ key: string; value: string }>;
}) => {
  const first = (draft.firstName ?? "").trim().split(/\s+/)[0] ?? "";
  const name = first || (draft.lastName ?? "").trim() || "Stat card";
  const pts = lineValue(draft.stats, "pts");
  const reb = lineValue(draft.stats, "reb");
  const ast = lineValue(draft.stats, "ast");
  const min = lineValue(draft.stats, "min");
  const line =
    pts && reb && ast
      ? `${name} ${pts}/${reb}/${ast}${min ? ` in ${min} min` : ""}`
      : name;
  const date = (draft.gameDate ?? "").trim();
  return graphicCaption(line, [], date ? [date] : []);
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
