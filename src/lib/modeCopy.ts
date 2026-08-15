import {
  ALL_TIME_LABEL,
  CLASSIC_HEAD_TO_HEAD_LABEL,
  PRO_HEAD_TO_HEAD_LABEL,
} from "./modeLabels";

/** Product-facing mode ids used in copy / onboarding / chips. */
export type ModeCopyId =
  | "classicH2h"
  | "proH2h"
  | "daily"
  | "dailyBasic"
  | "dailyAdvanced"
  | "weeklyEvent"
  | "allTime"
  | "practice";

export type ModeCopy = {
  id: ModeCopyId;
  /** Internal matchmaking / profile mode when applicable. */
  internalMode?: "classic" | "ranked" | "event" | "daily" | "allTime";
  /** Short chip / tab label. */
  short: string;
  /** Full product title. */
  title: string;
  /** One-line descriptor for cards and onboarding. */
  blurb: string;
};

export const MODE_COPY: Record<ModeCopyId, ModeCopy> = {
  classicH2h: {
    id: "classicH2h",
    internalMode: "classic",
    short: "Casual",
    title: CLASSIC_HEAD_TO_HEAD_LABEL,
    blurb:
      "Softer salary cap with banner matchmaking — Front Office banners track your run.",
  },
  proH2h: {
    id: "proH2h",
    internalMode: "ranked",
    short: "Pro",
    title: PRO_HEAD_TO_HEAD_LABEL,
    blurb:
      "Tighter salary cap, Elo ladder matchmaking, and a monthly Top 500 season.",
  },
  daily: {
    id: "daily",
    internalMode: "daily",
    short: "Daily",
    title: "Daily Draft",
    blurb:
      "One shared puzzle per day (Basic & Advanced) — no salary cap, chase percentile rank.",
  },
  dailyBasic: {
    id: "dailyBasic",
    internalMode: "daily",
    short: "Basic",
    title: "Daily Draft · Basic",
    blurb: "Today’s shared lineup puzzle — simpler goal.",
  },
  dailyAdvanced: {
    id: "dailyAdvanced",
    internalMode: "daily",
    short: "Advanced",
    title: "Daily Draft · Advanced",
    blurb: "Today’s shared lineup puzzle — tougher goal.",
  },
  weeklyEvent: {
    id: "weeklyEvent",
    internalMode: "event",
    short: "Event",
    title: "Weekly Event",
    blurb: "Limited weekly H2H challenge with its own standings board.",
  },
  allTime: {
    id: "allTime",
    internalMode: "allTime",
    short: ALL_TIME_LABEL,
    title: ALL_TIME_LABEL,
    blurb: "Peak seasons and era legends — coming soon.",
  },
  practice: {
    id: "practice",
    short: "Practice",
    title: "Practice",
    blurb: "Vs a bot — no streaks, badges, or leaderboard impact.",
  },
};

export const getModeCopy = (id: ModeCopyId): ModeCopy => MODE_COPY[id];

/** Short label for H2H internal modes. */
export const shortLabelForH2hMode = (
  mode: "classic" | "ranked" | "event" | string,
): string => {
  if (mode === "ranked") return MODE_COPY.proH2h.short;
  if (mode === "event") return MODE_COPY.weeklyEvent.short;
  if (mode === "classic") return MODE_COPY.classicH2h.short;
  return mode;
};

/** Hub onboarding bullets — single source for Play hub first-run. */
export const HUB_ONBOARDING_LEDE = "Pick a path — you can switch anytime from Play.";

/** Intent cards after hub onboarding — routes new users by goal. */
export const HUB_PLAY_INTENTS: Array<{
  id: "daily" | "h2h" | "events";
  title: string;
  body: string;
  accent: "daily" | "h2h" | "event";
  playSection: "daily" | "headToHead" | "events";
  h2hMode?: "classic" | "ranked";
}> = [
  {
    id: "daily",
    title: "Daily Draft",
    body: "One shared puzzle a day. No salary cap.",
    accent: "daily",
    playSection: "daily",
  },
  {
    id: "h2h",
    title: "Head to Head",
    body: "Casual or Pro live matchups.",
    accent: "h2h",
    playSection: "headToHead",
  },
  {
    id: "events",
    title: "Weekly Event",
    body: "Limited challenge with its own board.",
    accent: "event",
    playSection: "events",
  },
];
