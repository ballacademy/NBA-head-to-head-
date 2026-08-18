import {
  loadAllEventProfiles,
  type EventProfile,
} from "./eventProfile";
import {
  describeEventFromId,
  formatEventBadgeEmoji,
  formatEventBadgeLabel,
  getTopEventBadgeTier,
  isCurrentEventId,
  type EventBadgeTier,
} from "./weeklyEvents";

export type EventHistoryRow = {
  eventId: string;
  weekLabel: string;
  title: string;
  restrictionLabel: string;
  wins: number;
  losses: number;
  ties: number;
  matchesPlayed: number;
  isCurrent: boolean;
  topBadge: EventBadgeTier | null;
  topBadgeLabel: string | null;
  topBadgeEmoji: string | null;
};

export const buildEventHistoryRows = (
  profiles: EventProfile[] = loadAllEventProfiles(),
  currentEventId: string | null = null,
): EventHistoryRow[] =>
  profiles
    .filter((profile) => profile.matchesPlayed > 0)
    .map((profile) => {
      const meta = describeEventFromId(profile.eventId);
      const topBadge = getTopEventBadgeTier(profile.badges);

      return {
        eventId: profile.eventId,
        weekLabel: meta.weekLabel,
        title: meta.title,
        restrictionLabel: meta.restrictionLabel,
        wins: profile.wins,
        losses: profile.losses,
        ties: profile.ties,
        matchesPlayed: profile.matchesPlayed,
        isCurrent:
          isCurrentEventId(profile.eventId) ||
          (currentEventId != null && profile.eventId === currentEventId),
        topBadge,
        topBadgeLabel: topBadge ? formatEventBadgeLabel(topBadge) : null,
        topBadgeEmoji: topBadge ? formatEventBadgeEmoji(topBadge) : null,
      };
    });

export const formatEventPresenceLabel = (params: {
  matchesPlayed: number;
  matchesLeft: number;
  maxMatches: number;
}) => {
  if (params.matchesPlayed <= 0) {
    return "Not started this week";
  }

  if (params.matchesLeft <= 0) {
    return "Week complete — all matches used";
  }

  return `Active · ${params.matchesPlayed} played · ${params.matchesLeft} left`;
};
