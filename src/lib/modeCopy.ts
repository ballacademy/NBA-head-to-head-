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
    blurb: "$150M cap. Banners matchmaking.",
  },
  proH2h: {
    id: "proH2h",
    internalMode: "ranked",
    short: "Pro",
    title: PRO_HEAD_TO_HEAD_LABEL,
    blurb: "$100M cap. Banners matchmaking.",
  },
  daily: {
    id: "daily",
    internalMode: "daily",
    short: "Daily",
    title: "Daily Draft",
    blurb: "One shared puzzle per day — chase your percentile.",
  },
  dailyBasic: {
    id: "dailyBasic",
    internalMode: "daily",
    short: "Basic",
    title: "Daily Draft · Basic",
    blurb: "Season per-game goal.",
  },
  dailyAdvanced: {
    id: "dailyAdvanced",
    internalMode: "daily",
    short: "Advanced",
    title: "Daily Draft · Advanced",
    blurb: "Per-minute and rate goal.",
  },
  weeklyEvent: {
    id: "weeklyEvent",
    internalMode: "event",
    short: "Event",
    title: "Weekly Event",
    blurb: "Limited weekly H2H with its own board.",
  },
  allTime: {
    id: "allTime",
    internalMode: "allTime",
    short: ALL_TIME_LABEL,
    title: ALL_TIME_LABEL,
    blurb:
      "Peak seasons and era legends. Unlock legends with 50 All-Time wins or 1000 All-Time banners.",
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
