export const BETA_NOTES_SECTIONS = [
  "live",
  "limits",
  "sample",
  "feedback",
] as const;

export type BetaNotesSection = (typeof BETA_NOTES_SECTIONS)[number];

export const isBetaNotesSection = (
  value: string | null | undefined,
): value is BetaNotesSection =>
  value === "live" ||
  value === "limits" ||
  value === "sample" ||
  value === "feedback";

export const parseBetaNotesSection = (
  value: string | null | undefined,
): BetaNotesSection | null => {
  if (!value) {
    return null;
  }

  const token = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (token === "whats-live" || token === "what's-live" || token === "live") {
    return "live";
  }
  if (token === "known-limits" || token === "limits") {
    return "limits";
  }
  if (
    token === "limited-sample" ||
    token === "sample" ||
    token === "sample-size"
  ) {
    return "sample";
  }
  if (token === "feedback" || token === "bugs" || token === "support") {
    return "feedback";
  }

  return isBetaNotesSection(token) ? token : null;
};

/** Absolute share URL for Beta notes, optionally scrolled to a section. */
export const buildBetaNotesShareUrl = (
  section: BetaNotesSection | null = null,
) => {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.draftdaygm.com";
  const url = new URL(origin);
  url.searchParams.set("hub", "beta");
  if (section) {
    url.searchParams.set("section", section);
  }
  return url.toString();
};
